/**
 * Bet Type Toggle component for the Wager Calculator
 * Allows switching between Binary (Yes/No) and Multi-categorical bets
 */

import { BetType } from '../types/index'

// Component Props Interface
export interface BetTypeToggleProps {
  selectedType: BetType
  onChange: (type: BetType) => void
  showDescriptions?: boolean
  id?: string
  disabled?: boolean
}

/**
 * Creates a bet type toggle component with radio buttons for Binary vs Multi-categorical
 */
export function createBetTypeToggle(props: BetTypeToggleProps): HTMLElement {
  const container = document.createElement('fieldset')
  container.className = 'bet-type-toggle'

  // Use custom ID or default
  const baseId = props.id || 'bet-type'

  // Create legend for accessibility
  const legend = document.createElement('legend')
  legend.textContent = 'Bet Type'
  legend.className = 'bet-type-legend'
  container.appendChild(legend)

  // Create options container
  const optionsContainer = document.createElement('div')
  optionsContainer.className = 'bet-type-options'

  // Binary option
  const binaryOption = createBetTypeOption({
    type: BetType.Binary,
    label: 'Binary (Yes/No)',
    description: 'A simple yes/no question with two possible outcomes',
    isSelected: props.selectedType === BetType.Binary,
    name: baseId,
    id: `${baseId}-binary`,
    disabled: props.disabled || false,
    showDescription: props.showDescriptions || false,
    onChange: () => props.onChange(BetType.Binary),
  })

  // Multi-categorical option
  const multiOption = createBetTypeOption({
    type: BetType.MultiCategorical,
    label: 'Multi-categorical (Multiple Options)',
    description: 'A question with multiple possible outcomes (2-8 categories)',
    isSelected: props.selectedType === BetType.MultiCategorical,
    name: baseId,
    id: `${baseId}-multi`,
    disabled: props.disabled || false,
    showDescription: props.showDescriptions || false,
    onChange: () => props.onChange(BetType.MultiCategorical),
  })

  optionsContainer.appendChild(binaryOption)
  optionsContainer.appendChild(multiOption)
  container.appendChild(optionsContainer)

  return container
}

// Interface for individual bet type option
interface BetTypeOptionProps {
  type: BetType
  label: string
  description: string
  isSelected: boolean
  name: string
  id: string
  disabled: boolean
  showDescription: boolean
  onChange: () => void
}

/**
 * Creates an individual bet type option with radio button and optional description
 */
function createBetTypeOption(props: BetTypeOptionProps): HTMLElement {
  const optionContainer = document.createElement('div')
  optionContainer.className = `bet-type-option ${props.isSelected ? 'selected' : ''}`
  optionContainer.setAttribute('data-type', props.type)

  // Create radio input
  const radioInput = document.createElement('input')
  radioInput.type = 'radio'
  radioInput.name = props.name
  radioInput.id = props.id
  radioInput.value = props.type
  radioInput.checked = props.isSelected
  radioInput.className = 'bet-type-radio'

  if (props.disabled) {
    radioInput.disabled = true
  }

  // Add change event listener
  radioInput.addEventListener('change', e => {
    const target = e.target as HTMLInputElement
    if (target.checked && !props.disabled) {
      props.onChange()
    }
  })

  // Create label
  const label = document.createElement('label')
  label.htmlFor = props.id
  label.className = 'bet-type-label'

  // Create label content container
  const labelContent = document.createElement('div')
  labelContent.className = 'bet-type-label-content'

  // Main label text
  const labelText = document.createElement('div')
  labelText.className = 'bet-type-label-text'
  labelText.textContent = props.label

  labelContent.appendChild(labelText)

  // Optional description
  if (props.showDescription) {
    const description = document.createElement('div')
    description.className = 'bet-type-description'
    description.textContent = props.description
    labelContent.appendChild(description)
  }

  label.appendChild(labelContent)

  // Assemble option
  optionContainer.appendChild(radioInput)
  optionContainer.appendChild(label)

  return optionContainer
}
