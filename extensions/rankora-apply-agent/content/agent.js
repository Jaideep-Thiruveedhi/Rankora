/**
 * Rankora Apply Agent V1 — content script.
 *
 * Runs only when THIS extension injects it, and does exactly two things:
 *   SCAN — returns metadata of visible form controls (labels, kinds, required
 *          flags, option lists). It never reads a control's VALUE.
 *   FILL — writes values the Rankora server resolved from the student's own
 *          profile into controls the student explicitly approved, dispatching
 *          input/change events, and reports per-field results.
 *
 * It never submits forms, never touches password/OTP/CAPTCHA/payment/upload
 * fields, and never acts without an explicit FILL message from the extension.
 */

const UNSAFE_PATTERNS = [
  /password/i,
  /\bpasswd\b/i,
  /\botp\b/i,
  /one[\s-]?time/i,
  /\bcaptcha\b/i,
  /\bcvv\b/i,
  /\bcvc\b/i,
  /card[\s-]?(no|number|num|holder)/i,
  /\bdebit\b/i,
  /credit[\s-]?card/i,
  /\bpayment\b/i,
  /security[\s-]?(code|pin)/i,
  /bank[\s-]?(account|ifsc|branch)/i,
  /\baadhaar\b/i,
  /\baadhar\b/i,
  /\bupload\b/i,
  /\battach(ment)?\b/i,
]

const SKIP_INPUT_TYPES = new Set(['hidden', 'submit', 'reset', 'button', 'image'])
const FILLABLE_TEXT_KINDS = new Set(['text', 'textarea', 'email', 'tel', 'date', 'number'])

/** sniffed results of the last scan; entries keep live DOM references */
let scanRegistry = []

/* ------------------------------------------------------------------ */
/* generic helpers                                                     */
/* ------------------------------------------------------------------ */

function normalizeLabel(raw) {
  return String(raw == null ? '' : raw).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function untrustedText(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim()
}

function cssEscape(value) {
  if (window.CSS && typeof CSS.escape === 'function') return CSS.escape(value)
  return String(value).replace(/([^\w-])/g, '\\$1')
}

function textLabelledBy(idList) {
  return idList
    .split(/\s+/)
    .map(id => document.getElementById(id))
    .filter(Boolean)
    .map(el => untrustedText(el.textContent))
    .filter(Boolean)
    .join(' ')
    .trim()
}

function isVisibleControl(element) {
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  if (parseFloat(style.opacity || '1') === 0) return false
  return element.getClientRects().length > 0
}

function isUnsafeDescriptor(parts) {
  const haystack = parts.join(' | ')
  return UNSAFE_PATTERNS.some(pattern => pattern.test(haystack))
}

/* ------------------------------------------------------------------ */
/* label resolution                                                    */
/* ------------------------------------------------------------------ */

function labelForControl(control) {
  if (control.id) {
    const explicit = document.querySelector('label[for="' + cssEscape(control.id) + '"]')
    if (explicit) return untrustedText(explicit.textContent)
  }
  const nested = control.closest('label')
  if (nested) {
    const own = untrustedText(nested.textContent)
    if (own) return own
  }
  const labelledBy = control.getAttribute('aria-labelledby')
  if (labelledBy) {
    const joined = textLabelledBy(labelledBy)
    if (joined) return joined
  }
  const ariaLabel = control.getAttribute('aria-label')
  if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim()
  const placeholder = control.getAttribute('placeholder')
  if (placeholder && placeholder.trim()) return placeholder.trim() + ' (placeholder)'
  return ''
}

function labelledTextForRadio(radio) {
  if (radio.id) {
    const explicit = document.querySelector('label[for="' + cssEscape(radio.id) + '"]')
    if (explicit) return untrustedText(explicit.textContent)
  }
  const nested = radio.closest('label')
  if (nested) return untrustedText(nested.textContent)
  return ''
}

function labelForRadioGroup(radios) {
  const first = radios[0]
  const groupContainer = first.closest('[role="radiogroup"]')
  if (groupContainer) {
    const ariaLabel = groupContainer.getAttribute('aria-label')
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim()
    const labelledBy = groupContainer.getAttribute('aria-labelledby')
    if (labelledBy) {
      const joined = textLabelledBy(labelledBy)
      if (joined) return joined
    }
  }
  const fieldset = first.closest('fieldset')
  const legend = fieldset ? fieldset.querySelector('legend') : null
  if (legend) return untrustedText(legend.textContent)

  // last resort: the closest preceding sibling text of an enclosing container
  let node = first.parentElement
  while (node && node !== document.body) {
    const sibling = node.previousElementSibling
    const text = sibling ? untrustedText(sibling.textContent) : ''
    if (text && text.length <= 160) return text
    node = node.parentElement
  }
  return labelledTextForRadio(first)
}

/* ------------------------------------------------------------------ */
/* detection                                                           */
/* ------------------------------------------------------------------ */

function sameGroupRadios(radio) {
  const name = radio.name || ''
  const anchorForm = radio.form
  return Array.from(document.querySelectorAll('input[type="radio"]')).filter(other => {
    if (other.name !== name) return false
    const otherForm = other.form
    return anchorForm && otherForm ? otherForm === anchorForm : otherForm === anchorForm
  })
}

function optionsForSelect(control) {
  const options = Array.from(control.options).map(option => ({
    text: untrustedText(option.text),
    value: option.value || '',
  }))
  const hasValues = options.some(option => option.value !== '')
  if (!hasValues) return options.filter(option => option.text !== '')
  // Drop empty-value placeholder options ("Select day", "Choose...") so the
  // server's option-shape heuristics see the meaningful option list only.
  return options.filter(option => option.value !== '' && !/^(select|choose|pick)\b/i.test(option.text))
}

function collectControlUnits() {
  const units = []
  const groupedRadios = new Set()
  for (const element of document.querySelectorAll('input, textarea, select')) {
    if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement) && !(element instanceof HTMLSelectElement)) continue
    if (!isVisibleControl(element)) continue

    if (element instanceof HTMLSelectElement) {
      if (element.disabled) continue
      units.push({ kind: 'select', control: element })
      continue
    }

    if (element instanceof HTMLTextAreaElement) {
      if (element.disabled) continue
      units.push({ kind: 'textarea', control: element })
      continue
    }

    const type = (element.type || 'text').toLowerCase()

    if (SKIP_INPUT_TYPES.has(type)) continue
    if (type === 'password') continue // never detected, never reported, never filled
    if (element.disabled) continue

    if (type === 'radio') {
      if (groupedRadios.has(element)) continue
      const radios = sameGroupRadios(element).filter(isVisibleControl)
      radios.forEach(radio => groupedRadios.add(radio))
      if (radios.length === 0 || radios[0].disabled) continue
      units.push({ kind: 'radio-group', radios })
      continue
    }

    if (type === 'file') {
      units.push({ kind: 'file', control: element })
      continue
    }

    if (type === 'checkbox') {
      units.push({ kind: 'checkbox', control: element })
      continue
    }

    units.push({ kind: 'text-input', control: element, inputType: type })
  }
  return units
}

function kindForUnit(unit) {
  if (unit.kind === 'radio-group') return 'radio'
  if (unit.kind === 'file') return 'file'
  if (unit.kind === 'checkbox') return 'checkbox'
  if (unit.kind === 'textarea') return 'textarea'
  if (unit.kind === 'select') return 'select'
  const type = unit.inputType
  if (type === 'date') return 'date'
  if (type === 'number') return 'number'
  if (type === 'email') return 'email'
  if (type === 'tel') return 'tel'
  return 'text'
}

function descriptorForUnit(unit, index) {
  if (unit.kind === 'radio-group') {
    const first = unit.radios[0]
    return {
      index,
      label: labelForRadioGroup(unit.radios),
      kind: 'radio',
      inputName: first.name || '',
      inputId: first.id || '',
      required: unit.radios.some(radio => radio.required || radio.getAttribute('aria-required') === 'true'),
      inputType: 'radio',
      options: unit.radios.map(radio => ({
        text: labelledTextForRadio(radio) || radio.value || '',
        value: radio.value || '',
      })),
    }
  }

  const control = unit.control
  return {
    index,
    label: labelForControl(control),
    kind: kindForUnit(unit),
    inputName: control.name || '',
    inputId: control.id || '',
    required: control.required === true || control.getAttribute('aria-required') === 'true',
    inputType: unit.kind === 'textarea' ? 'textarea' : String(control.type || ''),
    options: unit.kind === 'select' ? optionsForSelect(control) : [],
  }
}

function scanPage() {
  scanRegistry = []
  const descriptors = []
  for (const unit of collectControlUnits()) {
    const index = descriptors.length
    const descriptor = descriptorForUnit(unit, index)
    descriptors.push(descriptor)
    scanRegistry.push({ descriptor, unit })
  }
  return { ok: true, fields: descriptors }
}

/* ------------------------------------------------------------------ */
/* filling                                                             */
/* ------------------------------------------------------------------ */

const VALUE_DESCRIPTOR_INPUT = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
const VALUE_DESCRIPTOR_TEXTAREA = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
const VALUE_DESCRIPTOR_SELECT = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')
const CHECKED_DESCRIPTOR = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')

function valueSetterFor(control) {
  if (control instanceof HTMLTextAreaElement) return VALUE_DESCRIPTOR_TEXTAREA ? VALUE_DESCRIPTOR_TEXTAREA.set : null
  if (control instanceof HTMLSelectElement) return VALUE_DESCRIPTOR_SELECT ? VALUE_DESCRIPTOR_SELECT.set : null
  return VALUE_DESCRIPTOR_INPUT ? VALUE_DESCRIPTOR_INPUT.set : null
}

function fireInputAndChange(control) {
  control.dispatchEvent(new Event('input', { bubbles: true }))
  control.dispatchEvent(new Event('change', { bubbles: true }))
}

function setChecked(target, checked) {
  if (CHECKED_DESCRIPTOR && CHECKED_DESCRIPTOR.set) CHECKED_DESCRIPTOR.set.call(target, checked)
  else target.checked = checked
  fireInputAndChange(target)
}

function pickOption(control, rawValue) {
  const wanted = normalizeLabel(rawValue)
  if (!wanted) return null
  const options = Array.from(control.options)
  let match = options.find(option => normalizeLabel(option.text) === wanted)
  if (!match) match = options.find(option => normalizeLabel(option.value) === wanted)
  if (!match && /^\d{1,4}$/.test(String(rawValue).trim())) {
    const numeric = parseInt(String(rawValue).trim(), 10)
    match = options.find(option => /^\d{1,4}$/.test(option.value) && parseInt(option.value, 10) === numeric)
  }
  return match || null
}

function pickRadio(radios, rawValue) {
  const wanted = normalizeLabel(rawValue)
  if (!wanted) return null
  return (
    radios.find(radio => normalizeLabel(labelledTextForRadio(radio)) === wanted) ||
    radios.find(radio => normalizeLabel(radio.value) === wanted) ||
    null
  )
}

function stillMatchesSnapshot(entry) {
  const control = entry.unit.control
  if (!control || !(control instanceof HTMLElement) || !control.isConnected) return false
  return (
    kindForUnit(entry.unit) === entry.descriptor.kind &&
    (control.name || '') === entry.descriptor.inputName &&
    labelForControl(control) === entry.descriptor.label
  )
}

function isUnsafeNow(entry) {
  return isUnsafeDescriptor([
    entry.descriptor.label,
    entry.descriptor.inputName,
    entry.descriptor.inputId,
    entry.descriptor.inputType || '',
  ])
}

function fillEntry(entry, rawValue) {
  const kind = entry.descriptor.kind
  if (kind === 'file') return 'refused'
  if (isUnsafeNow(entry)) return 'refused'

  // Radio groups carry descriptor kind 'radio' (detection reports the group as
  // kind: 'radio') and have no single `unit.control`, so they are handled here
  // BEFORE the generic snapshot check, which is only valid for single controls.
  if (kind === 'radio') {
    // Fresh lookup: single-page apps may have re-rendered since the scan.
    const radios = sameGroupRadios(entry.unit.radios[0]).filter(isVisibleControl)
    if (radios.length === 0) return 'stale'
    if (isUnsafeDescriptor([entry.descriptor.label, entry.descriptor.inputName || radios[0].name || ''])) return 'refused'
    const target = pickRadio(radios, rawValue)
    if (!target) return 'no-option'
    setChecked(target, true)
    return 'filled'
  }

  if (!stillMatchesSnapshot(entry)) return 'stale'
  const control = entry.unit.control
  const setter = valueSetterFor(control)

  if (kind === 'checkbox') {
    if (rawValue !== true) return 'skipped'
    setChecked(control, true)
    return 'filled'
  }

  if (kind === 'select') {
    if (control.disabled) return 'skipped'
    const option = pickOption(control, String(rawValue))
    if (!option) return 'no-option'
    if (setter) setter.call(control, option.value)
    else control.value = option.value
    fireInputAndChange(control)
    return 'filled'
  }

  if (!FILLABLE_TEXT_KINDS.has(kind)) return 'unsupported'
  if (control.readOnly) return 'skipped'
  const textValue = String(rawValue)
  if (kind === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(textValue)) return 'no-option'
  if (setter) setter.call(control, textValue)
  else control.value = textValue
  fireInputAndChange(control)
  return 'filled'
}

function applyFill(fills) {
  const results = []
  for (const fill of fills) {
    if (!fill || typeof fill.index !== 'number') continue
    const entry = scanRegistry.find(candidate => candidate.descriptor.index === fill.index)
    if (!entry) {
      results.push({ index: fill.index, status: 'stale' })
      continue
    }
    const valueOk = typeof fill.value === 'string' || fill.value === true
    if (!valueOk) {
      results.push({ index: fill.index, status: 'no-saved-value' })
      continue
    }
    results.push({ index: fill.index, status: fillEntry(entry, fill.value) })
  }
  return { ok: true, results }
}

/* ------------------------------------------------------------------ */
/* message endpoints (extension-only: pages cannot reach this)          */
/* ------------------------------------------------------------------ */

if (!window.__rankoraApplyAgentLoaded) {
  window.__rankoraApplyAgentLoaded = true
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message.type !== 'string') return
    if (message.type === 'RANKORA_SCAN') {
      sendResponse(scanPage())
      return
    }
    if (message.type === 'RANKORA_FILL') {
      sendResponse(applyFill(Array.isArray(message.fills) ? message.fills : []))
    }
  })
}
