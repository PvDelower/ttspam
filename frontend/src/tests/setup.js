import '@testing-library/jest-dom'

// Mock для fetch
global.fetch = vi.fn()

// Mock для window.location
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'localhost',
    href: 'http://localhost:3000',
  },
  writable: true,
})
