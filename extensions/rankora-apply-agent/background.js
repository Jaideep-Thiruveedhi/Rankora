/**
 * Rankora Apply Agent V1 — MV3 service worker.
 *
 * Holds ONLY the short-lived, workspace-scoped agent session token in
 * chrome.storage.local (extension-private storage; page JavaScript can never
 * read it). The httpOnly Rankora workspace cookie never appears here: the
 * server issued the agent session during pairing, and every agent API call
 * carries the x-rankora-agent-session header.
 */

const RANKORA_BASE = 'http://localhost:3000'
const SESSION_HEADER = 'x-rankora-agent-session'

const STORAGE_KEYS = { token: 'agentToken', expiresAt: 'agentExpiresAt' }
const TOKEN_PATTERN = /^[0-9a-f]{64}$/

/* ------------------------------ storage ------------------------------ */

function storageGet(keys) {
  return new Promise(resolve => {
    chrome.storage.local.get(keys, result => resolve(result))
  })
}

function storageSet(items) {
  return new Promise(resolve => {
    chrome.storage.local.set(items, () => resolve())
  })
}

function storageClearToken() {
  return new Promise(resolve => {
    chrome.storage.local.remove([STORAGE_KEYS.token, STORAGE_KEYS.expiresAt], () => resolve())
  })
}

async function storedSession() {
  const stored = await storageGet([STORAGE_KEYS.token, STORAGE_KEYS.expiresAt])
  const token = typeof stored[STORAGE_KEYS.token] === 'string' ? stored[STORAGE_KEYS.token] : ''
  if (!TOKEN_PATTERN.test(token)) return null
  return {
    token,
    expiresAt: typeof stored[STORAGE_KEYS.expiresAt] === 'string' ? stored[STORAGE_KEYS.expiresAt] : '',
  }
}

/* ------------------------------ agent API ------------------------------ */

async function agentApi(path, options = {}) {
  const session = await storedSession()
  if (!session) {
    return { ok: false, status: 401, body: { error: 'Not paired yet — paste a pairing code first.', code: 'AGENT_SESSION_INVALID' } }
  }
  try {
    const response = await fetch(RANKORA_BASE + path, {
      ...options,
      headers: { ...(options.headers || {}), [SESSION_HEADER]: session.token },
    })
    const body = await response.json().catch(() => null)
    if (response.status === 401) await storageClearToken()
    return { ok: response.ok, status: response.status, body }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: { error: 'Cannot reach Rankora at ' + RANKORA_BASE + ' — is the server running?', code: 'NETWORK' },
    }
  }
}

/* ------------------------------ pairing ------------------------------ */

async function pairWithCode(code) {
  try {
    const response = await fetch(RANKORA_BASE + '/api/agent/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const body = await response.json().catch(() => null)
    if (!response.ok || !body || typeof body.token !== 'string') {
      return { ok: false, error: (body && body.error) || ('Pairing failed (HTTP ' + response.status + ')') }
    }
    await storageSet({
      [STORAGE_KEYS.token]: body.token,
      [STORAGE_KEYS.expiresAt]: String(body.expiresAt || ''),
    })
    return { ok: true, expiresAt: String(body.expiresAt || '') }
  } catch (error) {
    return { ok: false, error: 'Cannot reach Rankora at ' + RANKORA_BASE + ' — is the server running?' }
  }
}

/* ------------------------------ page plumbing ------------------------------ */

function sendToTab(tabId, message) {
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, message, response => {
      const error = chrome.runtime.lastError
      if (error) {
        const noReceiver = /receiving end does not exist/i.test(error.message)
        resolve({ ok: false, error: noReceiver ? 'NO_CONTENT_SCRIPT' : error.message })
        return
      }
      resolve(response || { ok: false, error: 'Empty response from the page.' })
    })
  })
}

async function scanActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== 'number') {
    return { ok: false, error: 'No active tab found.' }
  }
  let response = await sendToTab(tab.id, { type: 'RANKORA_SCAN' })
  if (!response.ok && response.error === 'NO_CONTENT_SCRIPT') {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/agent.js'],
      })
    } catch (error) {
      return {
        ok: false,
        error: 'Chrome refused script injection on this page. The agent only runs on normal http(s) web pages — try chrome:// pages, the Chrome Web Store and PDF viewers are off limits.',
      }
    }
    response = await sendToTab(tab.id, { type: 'RANKORA_SCAN' })
  }
  return response
}

/** Scan the page, then turn the detected descriptors into a mapped, redacted
 * fill plan using the server (deterministic rules + optional local model). */
async function scanAndMap() {
  const scan = await scanActiveTab()
  if (!scan.ok) return scan

  const fields = Array.isArray(scan.fields) ? scan.fields : []
  if (fields.length === 0) {
    return { ok: true, plan: null, note: 'No fillable form fields were found on this page.' }
  }

  const mapResponse = await agentApi('/api/agent/map', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  if (!mapResponse.ok) {
    return {
      ok: false,
      error: (mapResponse.body && mapResponse.body.error) || ('Mapping failed (HTTP ' + mapResponse.status + ')'),
    }
  }
  return { ok: true, plan: (mapResponse.body && mapResponse.body.plan) || null }
}

/* ------------------------------ filling ------------------------------ */

async function fillActiveTab(approved) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== 'number') {
    return { ok: false, error: 'No active tab found.' }
  }

  const canonicals = [...new Set(approved.map(item => item.canonical))]
  const valuesResponse = await agentApi('/api/agent/values', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: canonicals }),
  })
  if (!valuesResponse.ok) {
    return {
      ok: false,
      error: (valuesResponse.body && valuesResponse.body.error) || ('Could not fetch saved values (HTTP ' + valuesResponse.status + ')'),
    }
  }

  const body = valuesResponse.body || {}
  const values = body.values || {}
  const missing = Array.isArray(body.missing) ? body.missing : []

  const fills = []
  const noValue = []
  for (const item of approved) {
    if (Object.prototype.hasOwnProperty.call(values, item.canonical)) {
      fills.push({ index: item.index, canonical: item.canonical, value: values[item.canonical] })
    } else {
      noValue.push({ index: item.index, canonical: item.canonical, status: 'no-saved-value' })
    }
  }

  const pageResponse = await sendToTab(tab.id, { type: 'RANKORA_FILL', fills })
  if (!pageResponse.ok) return { ok: false, error: pageResponse.error || 'The page could not be filled.' }

  const results = Array.isArray(pageResponse.results) ? pageResponse.results : []
  return {
    ok: true,
    filled: results.filter(result => result.status === 'filled').length,
    results: results.concat(noValue),
  }
}

/* ------------------------------ message router ------------------------------ */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleAgentMessage(message).then(sendResponse)
  return true
})

async function handleAgentMessage(message) {
  if (!message || typeof message !== 'object') return { ok: false, error: 'Unknown message.' }
  switch (message.type) {
    case 'PAIR':
      return pairWithCode(String(message.code || ''))
    case 'STATUS': {
      const session = await storedSession()
      if (!session) return { ok: true, connected: false }
      const probe = await agentApi('/api/agent/session')
      return {
        ok: true,
        connected: probe.ok === true,
        expiresAt: probe.ok === true ? session.expiresAt : null,
        error: probe.ok === true ? null : ((probe.body && probe.body.error) || 'Session invalid.'),
      }
    }
    case 'SCAN':
      return scanAndMap()
    case 'FILL':
      return fillActiveTab(Array.isArray(message.approved) ? message.approved : [])
    case 'DISCONNECT':
      await storageClearToken()
      return { ok: true }
    default:
      return { ok: false, error: 'Unknown message type.' }
  }
}
