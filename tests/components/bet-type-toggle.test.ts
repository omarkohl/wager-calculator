/**
 * Test suite for bet type toggle component
 * Following TDD approach - tests written first to define expected behavior
 * Supports Binary vs Multi-categorical bet type switching
 */

import { describe, expect, test, beforeEach, afterEach } from '@jest/globals'
import { BetType } from '../../src/types/index'
import { createBetTypeToggle } from '../../src/components/bet-type-toggle'

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


describe('BetTypeToggle Component', () => {
  test('should render with Binary selected by default', () => {
    const betTypeToggle = createBetTypeToggle({
      selectedType: BetType.Binary,
      onChange: () => {},
    })

    container.appendChild(betTypeToggle)

    // Should have radio buttons for both options
    const binaryRadio = container.querySelector('input[value="binary"]') as HTMLInputElement
    const multiRadio = container.querySelector('input[value="multi-categorical"]') as HTMLInputElement

    expect(binaryRadio).toBeTruthy()
    expect(multiRadio).toBeTruthy()
    expect(binaryRadio.checked).toBe(true)
    expect(multiRadio.checked).toBe(false)
  })

  test('should render with Multi-categorical selected when provided', () => {
    const betTypeToggle = createBetTypeToggle({
      selectedType: BetType.MultiCategorical,
      onChange: () => {},
    })

    container.appendChild(betTypeToggle)

    const binaryRadio = container.querySelector('input[value="binary"]') as HTMLInputElement
    const multiRadio = container.querySelector('input[value="multi-categorical"]') as HTMLInputElement

    expect(binaryRadio.checked).toBe(false)
    expect(multiRadio.checked).toBe(true)
  })

  test('should call onChange when Binary option is selected', () => {
    let changedType: BetType | null = null
    const onChange = (type: BetType) => {
      changedType = type
    }

    const betTypeToggle = createBetTypeToggle({
      selectedType: BetType.MultiCategorical,
      onChange,
    })

    container.appendChild(betTypeToggle)

    const binaryRadio = container.querySelector('input[value="binary"]') as HTMLInputElement
    binaryRadio.click()

    expect(changedType).toBe(BetType.Binary)
  })

  test('should call onChange when Multi-categorical option is selected', () => {
    let changedType: BetType | null = null
    const onChange = (type: BetType) => {
      changedType = type
    }

    const betTypeToggle = createBetTypeToggle({
      selectedType: BetType.Binary,
      onChange,
    })

    container.appendChild(betTypeToggle)

    const multiRadio = container.querySelector('input[value="multi-categorical"]') as HTMLInputElement
    multiRadio.click()

    expect(changedType).toBe(BetType.MultiCategorical)
  })

  test('should display proper labels for both options', () => {
    const betTypeToggle = createBetTypeToggle({
      selectedType: BetType.Binary,
      onChange: () => {},
    })

    container.appendChild(betTypeToggle)

    // Check for labels
    const labels = container.querySelectorAll('label')
    const labelTexts = Array.from(labels).map(label => label.textContent?.trim())

    expect(labelTexts).toContain('Binary (Yes/No)')
    expect(labelTexts).toContain('Multi-categorical (Multiple Options)')
  })

  test('should show descriptions for each bet type', () => {
    const betTypeToggle = createBetTypeToggle({
      selectedType: BetType.Binary,
      onChange: () => {},
      showDescriptions: true,
    })

    container.appendChild(betTypeToggle)

    const descriptions = container.querySelectorAll('.bet-type-description')
    expect(descriptions.length).toBe(2)

    const descriptionTexts = Array.from(descriptions).map(desc => desc.textContent?.trim())
    expect(descriptionTexts.some(text => text?.includes('simple yes/no question'))).toBe(true)
    expect(descriptionTexts.some(text => text?.includes('multiple possible outcomes'))).toBe(true)
  })

  test('should group radio buttons with same name attribute', () => {
    const betTypeToggle = createBetTypeToggle({
      selectedType: BetType.Binary,
      onChange: () => {},
    })

    container.appendChild(betTypeToggle)

    const binaryRadio = container.querySelector('input[value="binary"]') as HTMLInputElement
    const multiRadio = container.querySelector('input[value="multi-categorical"]') as HTMLInputElement

    expect(binaryRadio.name).toBe('bet-type')
    expect(multiRadio.name).toBe('bet-type')
    expect(binaryRadio.name).toBe(multiRadio.name)
  })

  test('should have proper accessibility attributes', () => {
    const betTypeToggle = createBetTypeToggle({
      selectedType: BetType.Binary,
      onChange: () => {},
    })

    container.appendChild(betTypeToggle)

    // Check fieldset for grouping
    const fieldset = container.querySelector('fieldset')
    expect(fieldset).toBeTruthy()

    // Check legend for group description
    const legend = container.querySelector('legend')
    expect(legend).toBeTruthy()
    expect(legend?.textContent).toContain('Bet Type')

    // Check radio buttons have proper attributes
    const radioButtons = container.querySelectorAll('input[type="radio"]')
    radioButtons.forEach(radio => {
      expect(radio.getAttribute('name')).toBe('bet-type')
    })

    // Check labels are properly associated
    const labels = container.querySelectorAll('label')
    labels.forEach(label => {
      const forAttr = label.getAttribute('for')
      expect(forAttr).toBeTruthy()
      const associatedInput = container.querySelector(`#${forAttr}`)
      expect(associatedInput).toBeTruthy()
    })
  })

  test('should support custom ID for radio button naming', () => {
    const betTypeToggle = createBetTypeToggle({
      selectedType: BetType.Binary,
      onChange: () => {},
      id: 'custom-bet-type',
    })

    container.appendChild(betTypeToggle)

    const radioButtons = container.querySelectorAll('input[type="radio"]')
    radioButtons.forEach(radio => {
      expect(radio.getAttribute('name')).toBe('custom-bet-type')
    })
  })

  test('should handle disabled state correctly', () => {
    const betTypeToggle = createBetTypeToggle({
      selectedType: BetType.Binary,
      onChange: () => {},
      disabled: true,
    })

    container.appendChild(betTypeToggle)

    const radioButtons = container.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>
    radioButtons.forEach(radio => {
      expect(radio.disabled).toBe(true)
    })

    // Should not call onChange when disabled
    let changeCallCount = 0
    const betTypeToggleEnabled = createBetTypeToggle({
      selectedType: BetType.Binary,
      onChange: () => { changeCallCount++ },
      disabled: true,
    })

    container.appendChild(betTypeToggleEnabled)
    const disabledRadio = container.querySelector('input[value="multi-categorical"]') as HTMLInputElement
    disabledRadio.click()

    expect(changeCallCount).toBe(0)
  })

  test('should show visual indication of selected state', () => {
    const betTypeToggle = createBetTypeToggle({
      selectedType: BetType.Binary,
      onChange: () => {},
    })

    container.appendChild(betTypeToggle)

    const binaryContainer = container.querySelector('.bet-type-option[data-type="binary"]')
    const multiContainer = container.querySelector('.bet-type-option[data-type="multi-categorical"]')

    expect(binaryContainer?.classList.contains('selected')).toBe(true)
    expect(multiContainer?.classList.contains('selected')).toBe(false)
  })

  test('should update visual state when selection changes', () => {
    let currentType = BetType.Binary
    const onChange = (type: BetType) => {
      currentType = type
      // Re-render component to test visual updates
      container.innerHTML = ''
      const updatedToggle = createBetTypeToggle({
        selectedType: currentType,
        onChange,
      })
      container.appendChild(updatedToggle)
    }

    const betTypeToggle = createBetTypeToggle({
      selectedType: currentType,
      onChange,
    })

    container.appendChild(betTypeToggle)

    // Click multi-categorical option
    const multiRadio = container.querySelector('input[value="multi-categorical"]') as HTMLInputElement
    multiRadio.click()

    // Check visual state after change
    const binaryContainer = container.querySelector('.bet-type-option[data-type="binary"]')
    const multiContainer = container.querySelector('.bet-type-option[data-type="multi-categorical"]')

    expect(binaryContainer?.classList.contains('selected')).toBe(false)
    expect(multiContainer?.classList.contains('selected')).toBe(true)
  })
})

describe('BetTypeToggle Integration', () => {
  test('should work with TypeScript enum values', () => {
    // Test that the component properly handles TypeScript enum values
    expect(BetType.Binary).toBe('binary')
    expect(BetType.MultiCategorical).toBe('multi-categorical')

    const betTypeToggle = createBetTypeToggle({
      selectedType: BetType.Binary,
      onChange: (type) => {
        // Verify type is properly typed as BetType enum
        expect(typeof type).toBe('string')
        expect([BetType.Binary, BetType.MultiCategorical]).toContain(type)
      },
    })

    expect(betTypeToggle).toBeTruthy()
  })

  test('should maintain state consistency across renders', () => {
    let renders = 0
    const onChange = (type: BetType) => {
      renders++
      expect([BetType.Binary, BetType.MultiCategorical]).toContain(type)
    }

    const betTypeToggle = createBetTypeToggle({
      selectedType: BetType.Binary,
      onChange,
    })

    container.appendChild(betTypeToggle)

    // Simulate multiple interactions
    const multiRadio = container.querySelector('input[value="multi-categorical"]') as HTMLInputElement
    const binaryRadio = container.querySelector('input[value="binary"]') as HTMLInputElement

    multiRadio.click()
    binaryRadio.click()
    multiRadio.click()

    expect(renders).toBe(3)
  })
})

