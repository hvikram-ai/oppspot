# Opp Scan Testing Guide

## Overview

This guide covers the comprehensive testing strategy for the refactored Opp Scan system. The testing suite ensures reliability, performance, and backward compatibility of the new Clean Architecture implementation.

## Test Structure

```
__tests__/
├── setup.ts                           # Global test configuration and utilities
├── domain/
│   ├── entities/
│   │   ├── company.entity.test.ts      # Company domain entity tests
│   │   └── scan.entity.test.ts         # Scan domain entity tests
│   └── events/
│       └── domain-events.test.ts       # Domain event tests
├── application/
│   ├── use-cases/
│   │   └── execute-scan.test.ts        # Use case tests
│   └── services/
│       ├── data-collection.service.test.ts    # Service integration tests
│       └── company-analysis.service.test.ts   # Analysis service tests
├── infrastructure/
│   ├── services/
│   │   ├── cache.service.test.ts       # Caching layer tests
│   │   ├── rate-limiting.service.test.ts      # Rate limiting tests
│   │   └── cost-management.service.test.ts    # Cost management tests
│   ├── repositories/
│   │   ├── scan.repository.test.ts     # Data persistence tests
│   │   └── company.repository.test.ts  # Company repository tests
│   └── resilience/
│       ├── circuit-breaker.test.ts     # Circuit breaker pattern tests
│       ├── retry-policy.test.ts        # Retry mechanism tests
│       └── resilience-decorator.test.ts       # Combined resilience tests
├── compatibility/
│   └── api-compatibility.test.ts       # Legacy API compatibility tests
└── e2e/
    └── complete-scan-pipeline.test.ts  # End-to-end workflow tests
```

## Test Types

### 1. Unit Tests
Test individual components in isolation with minimal dependencies.

**Coverage Targets:**
- Domain Entities: 95% functions, 90% lines
- Domain Events: 90% functions, 85% lines
- Overall: 85% functions, 85% lines

**Run Commands:**
```bash
# Run all unit tests
node test-runner.js unit

# Run specific layer
node test-runner.js domain
node test-runner.js application
node test-runner.js infrastructure
```

### 2. Integration Tests
Test service interactions and component integration.

**Features Tested:**
- Service orchestration
- Repository patterns
- Event publishing
- Cache integration
- External API interactions

**Run Commands:**
```bash
node test-runner.js integration
```

### 3. End-to-End Tests
Test complete business workflows from start to finish.

**Scenarios Covered:**
- Complete scan execution
- Progress tracking
- Error handling
- Performance benchmarks
- Concurrent processing

**Run Commands:**
```bash
node test-runner.js e2e
```

### 4. Compatibility Tests
Ensure backward compatibility with existing systems.

**Validation Areas:**
- Legacy API responses
- Data format compatibility
- Error message formats
- Performance parity

**Run Commands:**
```bash
node test-runner.js compatibility
```

## Running Tests

### Quick Start
```bash
# Make the test runner executable
chmod +x test-runner.js

# Run all tests
node test-runner.js all

# Run with coverage report
node test-runner.js coverage

# Run in watch mode for development
node test-runner.js watch
```

### Development Workflow
```bash
# 1. Run tests for the component you're working on
node test-runner.js domain

# 2. Run integration tests to ensure no breaking changes
node test-runner.js integration

# 3. Run full validation before committing
node test-runner.js validate
```

### CI/CD Pipeline
```bash
# Complete validation suite for CI
node test-runner.js ci
```

## Test Configuration

### Jest Configuration
Located in `jest.config.js` with multiple project configurations:

- **Unit Tests**: Focus on individual components
- **Integration Tests**: Test service interactions
- **E2E Tests**: Complete workflow validation

### Coverage Thresholds
```javascript
{
  global: {
    branches: 80,
    functions: 85,
    lines: 85,
    statements: 85
  },
  "./domain/entities/": {
    branches: 90,
    functions: 95,
    lines: 90,
    statements: 90
  }
}
```

## Test Utilities

### TestUtils
Global utilities for common test operations:

```typescript
// Create mock data
const company = TestUtils.createMockCompany({ name: 'Test Corp' })
const config = TestUtils.createMockScanConfiguration()

// Async operations
await TestUtils.delay(100)
await TestUtils.flushPromises()

// Mock operations
const mockOp = TestUtils.createMockOperation(['success', 'error'])
```

### Performance Testing
```typescript
// Measure execution time
const { result, duration } = await PerformanceTestUtils.measureTime(operation)

// Benchmark operations
const stats = await PerformanceTestUtils.benchmark(operation, 10)
console.log(`Mean: ${stats.mean}ms, Min: ${stats.min}ms, Max: ${stats.max}ms`)
```

### Integration Helpers
```typescript
// Setup test environment
const container = IntegrationTestHelpers.createTestContainer()
await IntegrationTestHelpers.setupTestDatabase()

// Cleanup after tests
await IntegrationTestHelpers.cleanupTestDatabase()
```

## Writing New Tests

### Domain Entity Tests
```typescript
describe('MyEntity', () => {
  let entity: MyEntity

  beforeEach(() => {
    entity = MyEntity.create('test-id', mockData)
  })

  describe('Business Logic', () => {
    it('should validate business rules', () => {
      expect(entity.isValid()).toBe(true)
    })

    it('should raise domain events', () => {
      entity.performAction()
      expect(entity.domainEvents).toHaveLength(1)
    })
  })

  describe('State Transitions', () => {
    it('should transition states correctly', () => {
      entity.changeState('new-state')
      expect(entity.currentState).toBe('new-state')
    })
  })
})
```

### Service Integration Tests
```typescript
describe('MyService Integration', () => {
  let service: MyService
  let mockDependencies: MockDependencies

  beforeEach(() => {
    mockDependencies = createMockDependencies()
    service = new MyService(mockDependencies)
  })

  it('should integrate with external services', async () => {
    mockDependencies.externalService.mockResolvedValue(mockResponse)
    
    const result = await service.performOperation()
    
    expect(result).toEqual(expectedResult)
    expect(mockDependencies.externalService).toHaveBeenCalledWith(expectedParams)
  })
})
```

### E2E Tests
```typescript
describe('Complete Workflow E2E', () => {
  let container: IContainer

  beforeAll(async () => {
    container = createTestContainer()
    await setupTestEnvironment()
  })

  afterAll(async () => {
    await cleanupTestEnvironment()
  })

  it('should complete entire workflow successfully', async () => {
    const orchestrator = container.resolve<IOrchestrator>('IOrchestrator')
    
    const result = await orchestrator.executeWorkflow(workflowConfig)
    
    expect(result).toEqual(expect.objectContaining({
      success: true,
      completedSteps: expect.any(Number),
      duration: expect.any(Number)
    }))
  })
})
```

## Test Data Management

### Mock Data Creation
```typescript
// Use builders for complex test data
const company = TestDataBuilder
  .company()
  .withName('Test Company')
  .withConfidence(0.9)
  .withIndustry('70100')
  .build()

const scan = TestDataBuilder
  .scan()
  .withId('test-scan')
  .withIndustries([{ code: '70100', name: 'Tech' }])
  .withSources(['source1', 'source2'])
  .build()
```

### Database Test Data
```typescript
// Setup test data in beforeEach
beforeEach(async () => {
  await database.clear()
  await database.seed(testDataFixtures)
})

// Clean up in afterEach
afterEach(async () => {
  await database.clear()
})
```

## Performance Testing

### Benchmarking
```typescript
it('should perform within acceptable limits', async () => {
  const iterations = 100
  const { mean, min, max } = await PerformanceTestUtils.benchmark(
    () => service.performOperation(),
    iterations
  )

  expect(mean).toBeLessThan(100) // 100ms average
  expect(max).toBeLessThan(500)  // 500ms maximum
})
```

### Load Testing
```typescript
it('should handle concurrent operations', async () => {
  const concurrentOperations = 50
  const promises = Array.from({ length: concurrentOperations }, () => 
    service.performOperation()
  )

  const results = await Promise.allSettled(promises)
  const successful = results.filter(r => r.status === 'fulfilled')

  expect(successful.length).toBeGreaterThan(concurrentOperations * 0.95) // 95% success rate
})
```

## Debugging Tests

### Enable Console Output
```typescript
import { TestUtils } from '../setup'

beforeEach(() => {
  TestUtils.enableConsole() // For debugging specific tests
})
```

### Investigate Failures
```typescript
it('should debug failing operation', async () => {
  try {
    await service.performOperation()
  } catch (error) {
    console.log('Operation failed:', error)
    console.log('Service state:', service.getState())
    throw error
  }
})
```

## Continuous Integration

### Pre-commit Hooks
```bash
# Run before each commit
node test-runner.js validate
```

### CI Pipeline Configuration
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: node test-runner.js ci
      - uses: codecov/codecov-action@v2
```

## Troubleshooting

### Common Issues

**Tests timing out:**
```javascript
// Increase timeout in jest.config.js
testTimeout: 30000

// Or for specific tests
it('long running test', async () => {
  // test code
}, 60000) // 60 second timeout
```

**Memory leaks in tests:**
```typescript
afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})
```

**Async operation issues:**
```typescript
// Always await async operations
await TestUtils.flushPromises()

// Use fake timers for time-based tests
jest.useFakeTimers()
jest.advanceTimersByTime(1000)
jest.useRealTimers()
```

### Performance Issues
- Use `--detectOpenHandles` to find lingering connections
- Mock external services to isolate performance issues
- Use `--runInBand` to run tests serially if parallel execution causes issues

## Best Practices

1. **Keep tests fast and focused**
2. **Use descriptive test names**
3. **Follow the AAA pattern**: Arrange, Act, Assert
4. **Mock external dependencies**
5. **Test business logic, not implementation details**
6. **Maintain high test coverage for critical paths**
7. **Use integration tests for complex workflows**
8. **Keep test data minimal and relevant**

## Coverage Reports

After running tests with coverage:
- HTML report: `coverage/index.html`
- Console summary: Displayed after test execution
- LCOV format: `coverage/lcov.info` (for CI tools)

## Next Steps

1. **Run the complete test suite**: `node test-runner.js validate`
2. **Check coverage reports**: Open `coverage/index.html`
3. **Fix any failing tests** before proceeding with integration
4. **Set up CI/CD pipeline** with automated testing
5. **Monitor test performance** and optimize slow tests

The testing suite ensures the refactored Opp Scan system is reliable, performant, and maintains backward compatibility while providing comprehensive coverage of all architectural layers.