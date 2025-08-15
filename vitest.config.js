import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Environment simulating DOM for Chrome extensions
    environment: 'happy-dom',
    
    // Setup file for browser API mocks configuration
    setupFiles: ['./tests/setup.js'],
    
    // Vitest APIs available globally (describe, it, expect, vi)
    globals: true,
    
    // Timeout for tests (useful for async operations)
    testTimeout: 5000,
    
    // Include test files
    include: ['tests/**/*.test.js'],
    
    // Exclude irrelevant files
    exclude: ['node_modules', 'dist', 'screenshots']
  },
  
  // Module resolution for Chrome extension
  resolve: {
    // Allow importing JS modules without extension
    extensions: ['.js', '.mjs', '.json']
  }
})