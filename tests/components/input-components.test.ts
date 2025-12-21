/**
 * Test suite for input components
 * Following TDD approach - tests written first to define expected behavior
 */

import { describe, expect, test, beforeEach, afterEach } from '@jest/globals'
import { Currency } from '../../src/types/index'
import { 
  createTextInput, 
  createTextArea, 
  createDateTimePicker, 
  createCurrencyDropdown 
} from '../../src/components/input-components'

// Container for testing DOM manipulation
let container: HTMLElement

beforeEach(() => {
  // Clean up any existing container
  const existingContainer = document.getElementById('test-container')
  if (existingContainer) {
    existingContainer.remove()
  }
  
  // Create fresh container for each test
  container = document.createElement('div')
  container.id = 'test-container'
  document.body.appendChild(container)
})

afterEach(() => {
  // Clean up after each test
  if (container && container.parentNode) {
    container.parentNode.removeChild(container)
  }
})

describe('TextInput Component', () => {
  test('should render text input with label and placeholder', () => {
    // This test will initially fail until we create the component
    const textInput = createTextInput({
      id: 'bet-title',
      label: 'Bet Title',
      placeholder: 'Enter bet title...',
      value: '',
      onChange: () => {},
    })

    container.appendChild(textInput)

    const label = container.querySelector('label')
    const input = container.querySelector('input[type="text"]')

    expect(label).toBeTruthy()
    expect(label?.textContent).toBe('Bet Title')
    expect(input).toBeTruthy()
    expect(input?.placeholder).toBe('Enter bet title...')
    expect(input?.id).toBe('bet-title')
  })

  test('should call onChange when input value changes', () => {
    let changedValue = ''
    const onChange = (value: string) => {
      changedValue = value
    }

    const textInput = createTextInput({
      id: 'bet-title',
      label: 'Bet Title',
      value: '',
      onChange,
    })

    container.appendChild(textInput)

    const input = container.querySelector('input') as HTMLInputElement
    input.value = 'New bet title'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    expect(changedValue).toBe('New bet title')
  })

  test('should display validation error when provided', () => {
    const textInput = createTextInput({
      id: 'bet-title',
      label: 'Bet Title',
      value: '',
      onChange: () => {},
      error: 'Title is required',
    })

    container.appendChild(textInput)

    const errorElement = container.querySelector('.error-message')
    expect(errorElement).toBeTruthy()
    expect(errorElement?.textContent).toBe('Title is required')
  })

  test('should apply required styling when required prop is true', () => {
    const textInput = createTextInput({
      id: 'bet-title',
      label: 'Bet Title',
      value: '',
      onChange: () => {},
      required: true,
    })

    container.appendChild(textInput)

    const label = container.querySelector('label')
    expect(label?.classList.contains('required')).toBe(true)
  })
})

describe('TextArea Component', () => {
  test('should render textarea with label and placeholder', () => {
    const textArea = createTextArea({
      id: 'bet-details',
      label: 'Bet Details',
      placeholder: 'Enter additional details...',
      value: '',
      onChange: () => {},
    })

    container.appendChild(textArea)

    const label = container.querySelector('label')
    const textarea = container.querySelector('textarea')

    expect(label).toBeTruthy()
    expect(label?.textContent).toBe('Bet Details')
    expect(textarea).toBeTruthy()
    expect(textarea?.placeholder).toBe('Enter additional details...')
    expect(textarea?.id).toBe('bet-details')
  })

  test('should call onChange when textarea value changes', () => {
    let changedValue = ''
    const onChange = (value: string) => {
      changedValue = value
    }

    const textArea = createTextArea({
      id: 'bet-details',
      label: 'Bet Details',
      value: '',
      onChange,
    })

    container.appendChild(textArea)

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    textarea.value = 'Detailed bet description'
    textarea.dispatchEvent(new Event('input', { bubbles: true }))

    expect(changedValue).toBe('Detailed bet description')
  })

  test('should support custom rows attribute', () => {
    const textArea = createTextArea({
      id: 'bet-details',
      label: 'Bet Details',
      value: '',
      onChange: () => {},
      rows: 5,
    })

    container.appendChild(textArea)

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    expect(textarea.rows).toBe(5)
  })
})

describe('DateTimePicker Component', () => {
  test('should render datetime-local input with label', () => {
    const datePicker = createDateTimePicker({
      id: 'bet-deadline',
      label: 'Bet Deadline',
      value: '',
      onChange: () => {},
    })

    container.appendChild(datePicker)

    const label = container.querySelector('label')
    const input = container.querySelector('input[type="datetime-local"]')

    expect(label).toBeTruthy()
    expect(label?.textContent).toBe('Bet Deadline')
    expect(input).toBeTruthy()
    expect(input?.id).toBe('bet-deadline')
  })

  test('should call onChange with Date object when value changes', () => {
    let changedDate: Date | null = null
    const onChange = (date: Date | null) => {
      changedDate = date
    }

    const datePicker = createDateTimePicker({
      id: 'bet-deadline',
      label: 'Bet Deadline',
      value: '',
      onChange,
    })

    container.appendChild(datePicker)

    const input = container.querySelector('input') as HTMLInputElement
    input.value = '2024-12-31T23:59'
    input.dispatchEvent(new Event('change', { bubbles: true }))

    expect(changedDate).toBeInstanceOf(Date)
    expect(changedDate?.getFullYear()).toBe(2024)
    expect(changedDate?.getMonth()).toBe(11) // December (0-indexed)
    expect(changedDate?.getDate()).toBe(31)
  })

  test('should format Date object to input value correctly', () => {
    const testDate = new Date('2024-12-31T23:59:00')
    const datePicker = createDateTimePicker({
      id: 'bet-deadline',
      label: 'Bet Deadline',
      value: testDate,
      onChange: () => {},
    })

    container.appendChild(datePicker)

    const input = container.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('2024-12-31T23:59')
  })
})

describe('CurrencyDropdown Component', () => {
  test('should render select dropdown with currency options', () => {
    const currencyDropdown = createCurrencyDropdown({
      id: 'bet-currency',
      label: 'Currency',
      value: Currency.USD,
      onChange: () => {},
    })

    container.appendChild(currencyDropdown)

    const label = container.querySelector('label')
    const select = container.querySelector('select')

    expect(label).toBeTruthy()
    expect(label?.textContent).toBe('Currency')
    expect(select).toBeTruthy()
    expect(select?.id).toBe('bet-currency')

    // Should have all currency options except ZZZ (DEFAULT placeholder)
    const options = select?.querySelectorAll('option')
    const expectedOptionsCount = Object.keys(Currency).length - 1 // Excluding ZZZ/DEFAULT
    expect(options?.length).toBe(expectedOptionsCount)
  })

  test('should call onChange with Currency enum value when selection changes', () => {
    let changedCurrency: Currency | null = null
    const onChange = (currency: Currency) => {
      changedCurrency = currency
    }

    const currencyDropdown = createCurrencyDropdown({
      id: 'bet-currency',
      label: 'Currency',
      value: Currency.USD,
      onChange,
    })

    container.appendChild(currencyDropdown)

    const select = container.querySelector('select') as HTMLSelectElement
    select.value = Currency.EUR
    select.dispatchEvent(new Event('change', { bubbles: true }))

    expect(changedCurrency).toBe(Currency.EUR)
  })

  test('should display selected currency value correctly', () => {
    const currencyDropdown = createCurrencyDropdown({
      id: 'bet-currency',
      label: 'Currency',
      value: Currency.GBP,
      onChange: () => {},
    })

    container.appendChild(currencyDropdown)

    const select = container.querySelector('select') as HTMLSelectElement
    expect(select.value).toBe(Currency.GBP)
  })

  test('should display currency labels with symbols correctly', () => {
    const currencyDropdown = createCurrencyDropdown({
      id: 'bet-currency',
      label: 'Currency',
      value: Currency.USD,
      onChange: () => {},
    })

    container.appendChild(currencyDropdown)

    const select = container.querySelector('select') as HTMLSelectElement
    const usdOption = select.querySelector('option[value="USD ($)"]') as HTMLOptionElement
    const eurOption = select.querySelector('option[value="EUR (€)"]') as HTMLOptionElement
    const gbpOption = select.querySelector('option[value="GBP (£)"]') as HTMLOptionElement

    expect(usdOption?.textContent).toContain('USD')
    expect(usdOption?.textContent).toContain('$')
    expect(eurOption?.textContent).toContain('EUR')
    expect(eurOption?.textContent).toContain('€')
    expect(gbpOption?.textContent).toContain('GBP')
    expect(gbpOption?.textContent).toContain('£')
  })
})

describe('Input Component Integration', () => {
  test('should support common accessibility attributes', () => {
    const textInput = createTextInput({
      id: 'accessible-input',
      label: 'Accessible Input',
      value: '',
      onChange: () => {},
      'aria-describedby': 'help-text',
      'aria-required': 'true',
    })

    container.appendChild(textInput)

    const input = container.querySelector('input') as HTMLInputElement
    expect(input.getAttribute('aria-describedby')).toBe('help-text')
    expect(input.getAttribute('aria-required')).toBe('true')
  })

  test('should support disabled state', () => {
    const textInput = createTextInput({
      id: 'disabled-input',
      label: 'Disabled Input',
      value: 'Cannot edit',
      onChange: () => {},
      disabled: true,
    })

    container.appendChild(textInput)

    const input = container.querySelector('input') as HTMLInputElement
    expect(input.disabled).toBe(true)
  })
})

