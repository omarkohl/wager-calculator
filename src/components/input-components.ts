/**
 * Input components for the Wager Calculator
 * Creates reusable input components following accessibility best practices
 */

import { Currency } from '../types/index'

// Component Props Interfaces
export interface TextInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  error?: string
  disabled?: boolean
  'aria-describedby'?: string
  'aria-required'?: string
}

export interface TextAreaProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  error?: string
  disabled?: boolean
}

export interface DateTimePickerProps {
  id: string
  label: string
  value: Date | string
  onChange: (date: Date | null) => void
  required?: boolean
  error?: string
  disabled?: boolean
}

export interface CurrencyDropdownProps {
  id: string
  label: string
  value: Currency
  onChange: (currency: Currency) => void
  required?: boolean
  error?: string
  disabled?: boolean
}

/**
 * Creates a text input component with label and validation support
 */
export function createTextInput(props: TextInputProps): HTMLElement {
  const container = document.createElement('div')
  container.className = 'input-group'

  // Create label
  const label = document.createElement('label')
  label.htmlFor = props.id
  label.textContent = props.label
  label.className = 'input-label'
  if (props.required) {
    label.classList.add('required')
  }

  // Create input
  const input = document.createElement('input')
  input.type = 'text'
  input.id = props.id
  input.value = props.value
  input.className = 'text-input'

  if (props.placeholder) {
    input.placeholder = props.placeholder
  }

  if (props.disabled) {
    input.disabled = props.disabled
  }

  if (props['aria-describedby']) {
    input.setAttribute('aria-describedby', props['aria-describedby'])
  }

  if (props['aria-required']) {
    input.setAttribute('aria-required', props['aria-required'])
  }

  // Add event listener for changes
  input.addEventListener('input', e => {
    const target = e.target as HTMLInputElement
    props.onChange(target.value)
  })

  // Append elements to container
  container.appendChild(label)
  container.appendChild(input)

  // Add error message if provided
  if (props.error) {
    const errorElement = document.createElement('div')
    errorElement.className = 'error-message'
    errorElement.textContent = props.error
    container.appendChild(errorElement)
  }

  return container
}

/**
 * Creates a textarea component with label and validation support
 */
export function createTextArea(props: TextAreaProps): HTMLElement {
  const container = document.createElement('div')
  container.className = 'input-group'

  // Create label
  const label = document.createElement('label')
  label.htmlFor = props.id
  label.textContent = props.label
  label.className = 'input-label'

  // Create textarea
  const textarea = document.createElement('textarea')
  textarea.id = props.id
  textarea.value = props.value
  textarea.className = 'textarea-input'

  if (props.placeholder) {
    textarea.placeholder = props.placeholder
  }

  if (props.rows) {
    textarea.rows = props.rows
  }

  if (props.disabled) {
    textarea.disabled = props.disabled
  }

  // Add event listener for changes
  textarea.addEventListener('input', e => {
    const target = e.target as HTMLTextAreaElement
    props.onChange(target.value)
  })

  // Append elements to container
  container.appendChild(label)
  container.appendChild(textarea)

  // Add error message if provided
  if (props.error) {
    const errorElement = document.createElement('div')
    errorElement.className = 'error-message'
    errorElement.textContent = props.error
    container.appendChild(errorElement)
  }

  return container
}

/**
 * Creates a datetime-local input component
 */
export function createDateTimePicker(props: DateTimePickerProps): HTMLElement {
  const container = document.createElement('div')
  container.className = 'input-group'

  // Create label
  const label = document.createElement('label')
  label.htmlFor = props.id
  label.textContent = props.label
  label.className = 'input-label'

  // Create input
  const input = document.createElement('input')
  input.type = 'datetime-local'
  input.id = props.id
  input.className = 'datetime-input'

  // Set initial value
  if (props.value instanceof Date) {
    input.value = formatDateForInput(props.value)
  } else if (typeof props.value === 'string') {
    input.value = props.value
  }

  if (props.disabled) {
    input.disabled = props.disabled
  }

  // Add event listener for changes
  input.addEventListener('change', e => {
    const target = e.target as HTMLInputElement
    const dateValue = target.value ? new Date(target.value) : null
    props.onChange(dateValue)
  })

  // Append elements to container
  container.appendChild(label)
  container.appendChild(input)

  // Add error message if provided
  if (props.error) {
    const errorElement = document.createElement('div')
    errorElement.className = 'error-message'
    errorElement.textContent = props.error
    container.appendChild(errorElement)
  }

  return container
}

/**
 * Creates a currency dropdown component
 */
export function createCurrencyDropdown(props: CurrencyDropdownProps): HTMLElement {
  const container = document.createElement('div')
  container.className = 'input-group'

  // Create label
  const label = document.createElement('label')
  label.htmlFor = props.id
  label.textContent = props.label
  label.className = 'input-label'

  // Create select
  const select = document.createElement('select')
  select.id = props.id
  select.value = props.value
  select.className = 'select-input'

  if (props.disabled) {
    select.disabled = props.disabled
  }

  // Add currency options
  Object.entries(Currency).forEach(([key, value]) => {
    if (key !== 'ZZZ') {
      // Skip DEFAULT placeholder
      const option = document.createElement('option')
      option.value = value
      option.textContent = value
      select.appendChild(option)
    }
  })

  // Set initial selection
  select.value = props.value

  // Add event listener for changes
  select.addEventListener('change', e => {
    const target = e.target as HTMLSelectElement
    props.onChange(target.value as Currency)
  })

  // Append elements to container
  container.appendChild(label)
  container.appendChild(select)

  // Add error message if provided
  if (props.error) {
    const errorElement = document.createElement('div')
    errorElement.className = 'error-message'
    errorElement.textContent = props.error
    container.appendChild(errorElement)
  }

  return container
}

/**
 * Helper function to format Date object for datetime-local input
 * Returns format: YYYY-MM-DDTHH:MM
 */
function formatDateForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}
