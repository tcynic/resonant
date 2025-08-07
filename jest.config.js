const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/convex/_generated/api$': '<rootDir>/convex/_generated/api',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^convex/react$': '<rootDir>/__mocks__/convex/react.js',
    '^convex-test$': '<rootDir>/__mocks__/convex-test.js',
    '^next/navigation$': '<rootDir>/__mocks__/next/navigation.js',
    '^next/link$': '<rootDir>/__mocks__/next/link.js',
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/smoke/',
    '<rootDir>/convex/__tests__/',
    '<rootDir>/convex/migrations/__tests__/',
    '<rootDir>/convex/monitoring/__tests__/',
    '<rootDir>/convex/fallback/__tests__/',
    '<rootDir>/convex/utils/__tests__/',
  ],
  transformIgnorePatterns: ['node_modules/(?!(convex-test|convex)/)'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  coveragePathIgnorePatterns: ['node_modules/', '.next/', 'coverage/'],
  // Memory management configuration
  maxWorkers: 2,
  workerIdleMemoryLimit: '512MB',
  testTimeout: 10000,
  detectOpenHandles: true,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
