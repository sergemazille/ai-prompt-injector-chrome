# Testing Guide for AI Prompt Injector

## 🎯 Complete Vitest Configuration

The AI Prompt Injector Chrome extension is now equipped with a comprehensive unit testing system using **Vitest** and **happy-dom**.

## 🚀 Test Commands

### Running Tests
```bash
# Install dependencies (first time)
npm install

# Run all tests once
npm test
# or
npm run test:run

# Run tests in watch mode (restarts automatically)
npm run test:watch

# Interactive graphical interface (optional)
npx vitest --ui
```

## 📊 Current Results

```
✓ tests/unit/basic-functionality.test.js  (19 tests) 6ms

Test Files  1 passed (1)
Tests  19 passed (19)
```

## 🧪 Tested Modules

### 1. **Basic Configuration**
- ✅ DOM access via happy-dom
- ✅ Chrome browser API mocks
- ✅ Functional test environment

### 2. **Core Business Logic**
- ✅ **Unique ID Generation**: Format `prompt_TIMESTAMP_RANDOM`
- ✅ **Prompt Validation**: Required label/template, length limits
- ✅ **Tag Management**: Unique collection, normalization
- ✅ **Prompt Sorting**: Favorites priority, then descending date

### 3. **Injection Features**
- ✅ **DOM Target Search**: Specific selectors + fallbacks
- ✅ **Element Validation**: Avoid disabled/readonly
- ✅ **Multi-platform Support**: textarea, contenteditable

### 4. **Import/Export**
- ✅ **JSON Parsing**: Standard format and direct arrays
- ✅ **Field Mapping**: Support `label`/`title`, `template`/`content`
- ✅ **Error Handling**: Invalid JSON, unsupported format

## 🔧 Technical Architecture

### File Structure
```
tests/
├── setup.js                    # Global configuration + mocks
├── mocks/
│   └── browser-mock.js         # Complete Chrome API mock
├── unit/
│   └── basic-functionality.test.js  # Business logic tests
├── fixtures/
│   └── sample-prompts.json     # Realistic test data
└── README.md                   # Detailed documentation
```

### Technologies Used
- **Vitest**: Modern, fast testing framework
- **happy-dom**: Lightweight DOM simulation
- **Custom Mocks**: Chrome APIs (`chrome.storage.local`, `chrome.runtime`)

## ✨ Key Strengths

1. **No Source Code Modifications**: Non-intrusive tests
2. **Complete Mocks**: Faithful Chrome environment simulation
3. **Isolated Tests**: Automatic cleanup between tests
4. **Functional Coverage**: Critical business logic tested
5. **Performance**: Fast execution (~286ms for 19 tests)

## 🎪 Usage Examples

### Continuous Development
```bash
# Watch mode for immediate feedback
npm run test:watch
```

### Specific Debugging
```bash
# Single test
npx vitest -t "generates ID with correct format"

# Specific pattern
npx vitest basic-functionality
```

### CI/CD Integration
```bash
# For automated scripts
npm run test:run
```

## 🛡️ Testing Strategy

### Principle
- **Business logic tests** rather than implementation details
- **Edge cases covered**: Invalid data, errors
- **Controlled environment**: No side effects

### Future Extensions
1. Add tests for `popup.js` (UI interactions)
2. Integration tests with real Chrome storage
3. Performance tests for large datasets
4. Coverage reporting (optional)

## 📈 Metrics

- **Execution Time**: ~286ms for complete suite
- **Reliability**: 100% success rate (19/19 tests)
- **Maintainability**: Modular architecture
- **Extensibility**: Easy addition of new tests

## 🔍 Test Categories

### Environment Verification
- DOM manipulation capabilities
- Browser API mock functionality
- Console logging verification

### Business Logic Validation
- ID generation uniqueness and format
- Prompt data validation rules
- Tag collection and normalization
- Sorting algorithms (favorites + dates)

### DOM Interaction Simulation
- Target element selection logic
- Element validity checking
- Multi-platform input support

### Data Processing
- JSON import/export handling
- Field mapping flexibility
- Error condition management

## 🚀 Getting Started

### 1. Installation
```bash
# Clone the repository and install
npm install
```

### 2. Run Tests
```bash
# Verify everything works
npm test
```

### 3. Development
```bash
# Start watch mode for continuous testing
npm run test:watch
```

### 4. Adding Tests
Create new test files in `tests/unit/` following the existing patterns.

---

**The AI Prompt Injector extension now has a solid foundation of unit tests ensuring code quality without compromising the existing architecture.**