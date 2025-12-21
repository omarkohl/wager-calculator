import './styles/main.css'
import {
  createTextInput,
  createTextArea,
  createDateTimePicker,
  createCurrencyDropdown,
} from './components/input-components'
import { createParticipantManager } from './components/participant-management'
import { createBetTypeToggle } from './components/bet-type-toggle'
import { createProbabilityMatrix, ProbabilityData } from './components/probability-matrix'
import { Currency, Participant, BetType } from './types/index'

// Application setup with input components demonstration
const app = document.querySelector<HTMLDivElement>('#app')!

// Application state
let currentParticipants: Participant[] = [
  { name: 'Artem', maxContribution: 10 },
  { name: 'Baanu', maxContribution: 15 },
]
let betTitle = ''
let betDetails = ''
let deadline: Date | null = null
let currency = Currency.USD
let betType = BetType.Binary
let currentProbabilities: ProbabilityData = {
  Artem: { yes: 60, no: 40 },
  Baanu: { yes: 75, no: 25 },
}

// Create container
const container = document.createElement('div')
container.className = 'container'

// Create header
const header = document.createElement('header')
header.innerHTML = `
  <h1>Wager Calculator</h1>
  <p>Fair betting odds using Brier scoring</p>
`

// Create main content area
const main = document.createElement('main')
main.className = 'form-demo'

// Create status message and update function (defined early to avoid reference errors)
const statusDiv = document.createElement('div')
statusDiv.className = 'status-message'

const updateStatusMessage = (): void => {
  const participantCount = currentParticipants.length
  const hasTitle = betTitle.trim().length > 0
  const minAmount = Math.min(...currentParticipants.map(p => p.maxContribution))
  const betTypeText = betType === BetType.Binary ? 'Binary (Yes/No)' : 'Multi-categorical'

  statusDiv.innerHTML = `
    <p><strong>✅ Probability Matrix Ready!</strong></p>
    <p>Current setup: ${hasTitle ? `"${betTitle}"` : 'Untitled bet'} - ${betTypeText}</p>
    <p>${participantCount} participants, Amount in play: $${minAmount.toFixed(2)} (${currency})</p>
    <p>Each participant can set their probability assessments using sliders or text inputs.</p>
  `
}

// Create probability assessment section (define early to avoid reference errors)
const probabilitySection = document.createElement('section')
probabilitySection.className = 'probability-section'
probabilitySection.innerHTML = '<h2>Probability Assessments</h2>'

// Generate categories based on bet type
const generateCategories = (): Array<{ id: string; name: string }> => {
  if (betType === BetType.Binary) {
    return [
      { id: 'yes', name: 'Yes' },
      { id: 'no', name: 'No' },
    ]
  } else {
    return [
      { id: 'option1', name: 'Option 1' },
      { id: 'option2', name: 'Option 2' },
      { id: 'option3', name: 'Option 3' },
      { id: 'option4', name: 'Option 4' },
    ]
  }
}

// Function to create/update probability matrix (defined early to avoid reference errors)
const updateProbabilityMatrix = (): void => {
  // Clear existing matrix
  const existingMatrix = probabilitySection.querySelector('.probability-matrix')
  if (existingMatrix) {
    existingMatrix.remove()
  }

  // Reset probabilities when bet type changes
  const categories = generateCategories()
  const defaultProbs: ProbabilityData = {}
  currentParticipants.forEach(participant => {
    defaultProbs[participant.name] = {}
    categories.forEach(category => {
      // For binary, default to 50/50, for multi-categorical, distribute evenly
      const defaultValue = betType === BetType.Binary ? 50 : 100 / categories.length
      defaultProbs[participant.name]![category.id] = defaultValue
    })
  })
  currentProbabilities = defaultProbs

  const probabilityMatrix = createProbabilityMatrix({
    participants: currentParticipants,
    categories: categories,
    betType,
    probabilities: currentProbabilities,
    onChange: probabilities => {
      currentProbabilities = probabilities
      // eslint-disable-next-line no-console
      console.log('Probabilities updated:', probabilities)
    },
    showSliders: true,
    showValidation: true,
    showTotals: true,
    showPercentageSymbols: true,
    showComplementaryBinary: true,
  })

  probabilitySection.appendChild(probabilityMatrix)
}

// Create form section
const formSection = document.createElement('section')
formSection.innerHTML = '<h2>Bet Setup</h2>'

// Create input components with state management
const betTitleInput = createTextInput({
  id: 'bet-title',
  label: 'Bet Title',
  placeholder: 'Enter the question or event to bet on...',
  value: betTitle,
  onChange: value => {
    betTitle = value
    // eslint-disable-next-line no-console
    console.log('Bet title:', value)
    updateStatusMessage()
  },
  required: true,
})

const betDetailsInput = createTextArea({
  id: 'bet-details',
  label: 'Additional Details (Optional)',
  placeholder: 'Add any clarifications, rules, or context...',
  value: betDetails,
  rows: 3,
  onChange: value => {
    betDetails = value
    // eslint-disable-next-line no-console
    console.log('Bet details:', value)
  },
})

const deadlineInput = createDateTimePicker({
  id: 'bet-deadline',
  label: 'Resolution Deadline (Optional)',
  value: deadline || '',
  onChange: date => {
    deadline = date
    // eslint-disable-next-line no-console
    console.log('Deadline:', date)
  },
})

const currencyInput = createCurrencyDropdown({
  id: 'bet-currency',
  label: 'Currency',
  value: currency,
  onChange: newCurrency => {
    currency = newCurrency
    // eslint-disable-next-line no-console
    console.log('Currency:', newCurrency)
  },
})

// Create bet type toggle
const betTypeToggle = createBetTypeToggle({
  selectedType: betType,
  onChange: type => {
    betType = type
    // eslint-disable-next-line no-console
    console.log('Bet type:', type)
    updateStatusMessage()
    updateProbabilityMatrix()
  },
  showDescriptions: true,
})

// Add components to form
formSection.appendChild(betTitleInput)
formSection.appendChild(betDetailsInput)
formSection.appendChild(deadlineInput)
formSection.appendChild(currencyInput)
formSection.appendChild(betTypeToggle)

// Create participant management section
const participantSection = document.createElement('section')
participantSection.className = 'participant-section'
participantSection.innerHTML = '<h2>Participants</h2>'

const participantManager = createParticipantManager({
  participants: currentParticipants,
  onChange: participants => {
    currentParticipants = participants
    // eslint-disable-next-line no-console
    console.log('Participants updated:', participants)
    // Update status display
    updateStatusMessage()
    updateProbabilityMatrix()
  },
  showAmountInPlay: true,
})

participantSection.appendChild(participantManager)

// Initial probability matrix creation
updateProbabilityMatrix()

// Initial status message
updateStatusMessage()

// Assemble the page
main.appendChild(formSection)
main.appendChild(participantSection)
main.appendChild(probabilitySection)
main.appendChild(statusDiv)
container.appendChild(header)
container.appendChild(main)
app.appendChild(container)
