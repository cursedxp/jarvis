// Test setup file for Jest
// Global test configurations and mocks

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};