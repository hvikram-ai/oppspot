/**
 * Jest Configuration for Opp Scan Testing
 * Comprehensive test configuration for unit, integration, and e2e tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directory for tests
  rootDir: './',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.js'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.ts'
  ],

  // TypeScript support
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },

  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1'
  },

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Stricter thresholds for core domain logic
    './domain/entities/': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    },
    './domain/events/': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    }
  },

  // Files to include in coverage
  collectCoverageFrom: [
    'core/**/*.ts',
    'domain/**/*.ts',
    'application/**/*.ts',
    'infrastructure/**/*.ts',
    '!**/__tests__/**',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],

  // Test timeout
  testTimeout: 30000,

  // Verbose output for CI
  verbose: process.env.CI === 'true',

  // Test projects for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/__tests__/domain/**/*.test.ts',
        '<rootDir>/__tests__/application/**/*.test.ts',
        '<rootDir>/__tests__/infrastructure/**/*.test.ts',
        '!<rootDir>/__tests__/e2e/**/*.test.ts'
      ],
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts']
    },
    {
      displayName: 'integration',
      testMatch: [
        '<rootDir>/__tests__/application/**/*.test.ts',
        '<rootDir>/__tests__/infrastructure/**/*.test.ts'
      ],
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts']
    },
    {
      displayName: 'e2e',
      testMatch: [
        '<rootDir>/__tests__/e2e/**/*.test.ts'
      ],
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
      testTimeout: 60000 // Longer timeout for e2e tests
    }
  ],

  // Global variables
  globals: {
    'ts-jest': {
      tsconfig: {
        target: 'es2019',
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true
      }
    }
  },

  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'js',
    'json'
  ],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Fail fast on first test failure in CI
  bail: process.env.CI === 'true' ? 1 : 0,

  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Error handling
  errorOnDeprecated: true,

  // Notification settings (only in non-CI environments)
  notify: process.env.CI !== 'true',
  notifyMode: 'failure-change',

  // Watch plugins for development
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Reporter configuration
  reporters: [
    'default',
    ...(process.env.CI === 'true' 
      ? [
          ['jest-junit', {
            outputDirectory: 'test-results/jest',
            outputName: 'results.xml'
          }]
        ] 
      : []
    )
  ]
}