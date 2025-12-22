import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

// Mock ResizeObserver for Headless UI components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock build-time globals for tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).__COMMIT_DATE__ = 'unknown'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).__COMMIT_HASH__ = 'unknown'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).__REPO_URL__ = ''

afterEach(() => {
  cleanup()
})
