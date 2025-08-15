// Global configuration for all Vitest tests
import { beforeEach, vi } from 'vitest'
import { installBrowserMock } from './mocks/browser-mock.js'

// Install global chrome mock before all tests
installBrowserMock() // Legacy support - installs both chrome and browser

// Mock extension-specific DOM APIs
global.console = {
  ...console,
  log: vi.fn(console.log),
  error: vi.fn(console.error),
  warn: vi.fn(console.warn)
}

// Mock navigator.clipboard for injection tests
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve())
  },
  writable: true
})

// Mock window.isSecureContext for clipboard tests
Object.defineProperty(window, 'isSecureContext', {
  value: true,
  writable: true
})

// Mock document.execCommand for fallbacks
document.execCommand = vi.fn(() => true)

// Cleanup before each test
beforeEach(() => {
  // Reset all mocks
  global.chrome?._resetAllMocks() || global.browser?._resetAllMocks()
  
  // Clean up DOM
  document.body.innerHTML = ''
  
  // Reset console mocks
  vi.clearAllMocks()
})