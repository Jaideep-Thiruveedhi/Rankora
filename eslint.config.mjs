import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // One-line debris scripts from an earlier repair attempt with invalid JS syntax:
    'fix-*.js',
    // Chrome extension (MV3) — plain browser JavaScript outside the app lint style.
    'extensions/**',
  ]),
])

export default eslintConfig
