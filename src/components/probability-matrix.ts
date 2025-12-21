/**
 * Probability Matrix component for the Wager Calculator
 * Handles probability input matrices for 2-8 participants in binary and multi-categorical bets
 */

import { Participant, BetType } from '../types/index'

// Component Props Interfaces
export interface Category {
  id: string
  name: string
}

export interface ProbabilityData {
  [participantName: string]: {
    [categoryId: string]: number
  }
}

export interface ProbabilityMatrixProps {
  participants: Participant[]
  categories: Category[]
  betType: BetType
  probabilities: ProbabilityData
  onChange: (probabilities: ProbabilityData) => void
  showSliders?: boolean
  showValidation?: boolean
  showTotals?: boolean
  showPercentageSymbols?: boolean
  showComplementaryBinary?: boolean
}

/**
 * Creates a probability matrix component for multi-participant probability assessments
 */
export function createProbabilityMatrix(props: ProbabilityMatrixProps): HTMLElement {
  const container = document.createElement('div')
  container.className = 'probability-matrix'

  // Create header
  const header = document.createElement('div')
  header.className = 'probability-matrix-header'

  const title = document.createElement('h3')
  title.textContent = 'Probability Assessments'
  title.className = 'probability-matrix-title'

  const description = document.createElement('p')
  description.textContent = `Each participant assigns probabilities to all ${props.betType === BetType.Binary ? '2' : props.categories.length} possible outcomes.`
  description.className = 'probability-matrix-description'

  header.appendChild(title)
  header.appendChild(description)
  container.appendChild(header)

  // Create table structure
  const table = document.createElement('div')
  table.className = 'probability-table'

  // Create table header
  const tableHeader = createTableHeader(props.categories)
  table.appendChild(tableHeader)

  // Create participant rows
  props.participants.forEach(participant => {
    const participantRow = createParticipantRow(participant, props)
    table.appendChild(participantRow)
  })

  container.appendChild(table)

  // Add validation section if enabled
  if (props.showValidation) {
    const validationSection = createValidationSection(props)
    container.appendChild(validationSection)
  }

  return container
}

/**
 * Creates the table header with category names
 */
function createTableHeader(categories: Category[]): HTMLElement {
  const header = document.createElement('div')
  header.className = 'probability-table-header'

  // Participant name column
  const participantHeader = document.createElement('div')
  participantHeader.className = 'probability-header-cell participant-header'
  participantHeader.textContent = 'Participant'

  header.appendChild(participantHeader)

  // Category columns
  categories.forEach(category => {
    const categoryHeader = document.createElement('div')
    categoryHeader.className = 'probability-header-cell probability-category-header'
    categoryHeader.textContent = category.name
    categoryHeader.setAttribute('data-category', category.id)
    header.appendChild(categoryHeader)
  })

  // Total column if needed
  const totalHeader = document.createElement('div')
  totalHeader.className = 'probability-header-cell total-header'
  totalHeader.textContent = 'Total'
  header.appendChild(totalHeader)

  return header
}

/**
 * Creates a row for a participant with probability inputs
 */
function createParticipantRow(
  participant: Participant,
  props: ProbabilityMatrixProps
): HTMLElement {
  const row = document.createElement('div')
  row.className = 'probability-participant-row'
  row.setAttribute('data-participant', participant.name)

  // Participant name cell
  const nameCell = document.createElement('div')
  nameCell.className = 'probability-cell participant-name-cell'
  nameCell.textContent = participant.name

  row.appendChild(nameCell)

  // Probability input cells
  props.categories.forEach(category => {
    const probabilityCell = createProbabilityCell(participant, category, props)
    row.appendChild(probabilityCell)
  })

  // Total cell
  const totalCell = createTotalCell(participant, props)
  row.appendChild(totalCell)

  return row
}

/**
 * Creates a cell with probability input controls
 */
function createProbabilityCell(
  participant: Participant,
  category: Category,
  props: ProbabilityMatrixProps
): HTMLElement {
  const cell = document.createElement('div')
  cell.className = 'probability-cell probability-input'
  cell.setAttribute('data-participant', participant.name)
  cell.setAttribute('data-category', category.id)

  const currentValue = props.probabilities[participant.name]?.[category.id] || 0

  // Create input container
  const inputContainer = document.createElement('div')
  inputContainer.className = 'probability-input-container'

  if (props.showSliders) {
    // Create slider + text input combination
    const slider = document.createElement('input')
    slider.type = 'range'
    slider.min = '0'
    slider.max = '100'
    slider.step = '0.1'
    slider.value = currentValue.toString()
    slider.className = 'probability-slider'

    const textInput = document.createElement('input')
    textInput.type = 'number'
    textInput.min = '0'
    textInput.max = '100'
    textInput.step = '0.1'
    textInput.value = currentValue.toString()
    textInput.className = 'probability-text-input'

    // Synchronize slider and text input
    slider.addEventListener('input', () => {
      textInput.value = slider.value
      updateProbability(participant.name, category.id, parseFloat(slider.value), props)
    })

    textInput.addEventListener('input', () => {
      const value = clampProbability(parseFloat(textInput.value) || 0)
      textInput.value = value.toString()
      slider.value = value.toString()
      updateProbability(participant.name, category.id, value, props)
    })

    inputContainer.appendChild(slider)
    inputContainer.appendChild(textInput)
  } else {
    // Create simple text input
    const textInput = document.createElement('input')
    textInput.type = 'number'
    textInput.min = '0'
    textInput.max = '100'
    textInput.step = '0.1'
    textInput.value = currentValue.toString()
    textInput.className = 'probability-text-input'

    textInput.addEventListener('input', () => {
      const value = clampProbability(parseFloat(textInput.value) || 0)
      textInput.value = value.toString()
      updateProbability(participant.name, category.id, value, props)
    })

    inputContainer.appendChild(textInput)
  }

  // Add percentage symbol if enabled
  if (props.showPercentageSymbols) {
    const percentSymbol = document.createElement('span')
    percentSymbol.className = 'percentage-symbol'
    percentSymbol.textContent = '%'
    inputContainer.appendChild(percentSymbol)
  }

  cell.appendChild(inputContainer)
  return cell
}

/**
 * Creates a total cell showing sum of probabilities for a participant
 */
function createTotalCell(participant: Participant, props: ProbabilityMatrixProps): HTMLElement {
  const cell = document.createElement('div')
  cell.className = 'probability-cell total-cell'
  cell.setAttribute('data-participant', participant.name)

  const total = calculateParticipantTotal(participant.name, props.probabilities, props.categories)
  const totalDisplay = document.createElement('div')
  totalDisplay.className = 'probability-sum-total'
  totalDisplay.textContent = `${total.toFixed(1)}%`

  // Add styling based on whether sum equals 100%
  if (Math.abs(total - 100) < 0.1) {
    totalDisplay.classList.add('valid-total')
  } else {
    totalDisplay.classList.add('invalid-total')
  }

  cell.appendChild(totalDisplay)
  return cell
}

/**
 * Creates validation section with warnings and scaling buttons
 */
function createValidationSection(props: ProbabilityMatrixProps): HTMLElement {
  const section = document.createElement('div')
  section.className = 'probability-validation-section'

  const warnings = document.createElement('div')
  warnings.className = 'probability-validation-warnings'

  const controls = document.createElement('div')
  controls.className = 'probability-validation-controls'

  // Check each participant's probability sum
  props.participants.forEach(participant => {
    const total = calculateParticipantTotal(participant.name, props.probabilities, props.categories)

    if (Math.abs(total - 100) > 0.1) {
      // Create warning
      const warning = document.createElement('div')
      warning.className = 'probability-validation-warning'
      warning.textContent = `${participant.name}'s probabilities sum to ${total.toFixed(1)}% (should be 100%)`
      warnings.appendChild(warning)

      // Create scaling button for this participant
      const scalingButton = document.createElement('button')
      scalingButton.className = 'probability-scaling-btn'
      scalingButton.textContent = `Scale ${participant.name} to 100%`
      scalingButton.type = 'button'

      scalingButton.addEventListener('click', () => {
        scaleParticipantProbabilities(participant.name, props)
      })

      controls.appendChild(scalingButton)
    }
  })

  if (warnings.children.length > 0) {
    section.appendChild(warnings)
    section.appendChild(controls)
    return section
  }

  // Return empty div if no validation issues
  return section
}

/**
 * Updates a specific probability and handles binary complementary logic
 */
function updateProbability(
  participantName: string,
  categoryId: string,
  value: number,
  props: ProbabilityMatrixProps
): void {
  const newProbabilities = JSON.parse(JSON.stringify(props.probabilities)) as ProbabilityData

  if (!newProbabilities[participantName]) {
    newProbabilities[participantName] = {}
  }

  newProbabilities[participantName][categoryId] = value

  // Handle binary complementary logic
  if (
    props.betType === BetType.Binary &&
    props.showComplementaryBinary &&
    props.categories.length === 2
  ) {
    const otherCategory = props.categories.find(cat => cat.id !== categoryId)
    if (otherCategory) {
      newProbabilities[participantName][otherCategory.id] = 100 - value
    }
  }

  props.onChange(newProbabilities)
}

/**
 * Scales a participant's probabilities to sum to 100%
 */
function scaleParticipantProbabilities(
  participantName: string,
  props: ProbabilityMatrixProps
): void {
  const newProbabilities = JSON.parse(JSON.stringify(props.probabilities)) as ProbabilityData
  const participantProbs = newProbabilities[participantName]

  if (!participantProbs) return

  const total = props.categories.reduce((sum, category) => {
    return sum + (participantProbs[category.id] || 0)
  }, 0)

  if (total === 0) return // Avoid division by zero

  // Scale each probability
  props.categories.forEach(category => {
    const currentValue = participantProbs[category.id] || 0
    participantProbs[category.id] = (currentValue / total) * 100
  })

  props.onChange(newProbabilities)
}

/**
 * Calculates the total probability for a participant
 */
function calculateParticipantTotal(
  participantName: string,
  probabilities: ProbabilityData,
  categories: Category[]
): number {
  const participantProbs = probabilities[participantName]
  if (!participantProbs) return 0

  return categories.reduce((sum, category) => {
    return sum + (participantProbs[category.id] || 0)
  }, 0)
}

/**
 * Clamps probability value to valid range [0, 100]
 */
function clampProbability(value: number): number {
  return Math.max(0, Math.min(100, value))
}
