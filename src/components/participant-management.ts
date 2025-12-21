/**
 * Multi-participant management components for the Wager Calculator
 * Supports 2-8 participants with dynamic add/remove functionality
 */

import { Participant } from '../types/index'

// Component Props Interface
export interface ParticipantManagerProps {
  participants: Participant[]
  onChange: (participants: Participant[]) => void
  showAmountInPlay?: boolean
}

// Constants
const MIN_PARTICIPANTS = 2
const MAX_PARTICIPANTS = 8

/**
 * Creates a participant management component with add/remove functionality
 * Enforces 2-8 participant limits and provides default names
 */
export function createParticipantManager(props: ParticipantManagerProps): HTMLElement {
  const container = document.createElement('div')
  container.className = 'participant-manager'

  // Helper function to generate default names
  const generateDefaultName = (index: number): string => {
    return `Person ${String.fromCharCode(65 + index)}` // A, B, C, etc.
  }

  // Initialize with minimum participants if none provided
  let currentParticipants = [...props.participants]
  if (currentParticipants.length === 0) {
    currentParticipants = [
      { name: 'Person A', maxContribution: 0 },
      { name: 'Person B', maxContribution: 0 },
    ]
  } else if (currentParticipants.length < MIN_PARTICIPANTS) {
    // Ensure minimum participants
    while (currentParticipants.length < MIN_PARTICIPANTS) {
      currentParticipants.push({
        name: generateDefaultName(currentParticipants.length),
        maxContribution: 0,
      })
    }
  }

  // Function to update the component display
  const updateDisplay = (): void => {
    container.innerHTML = ''

    // Create header
    const header = document.createElement('div')
    header.className = 'participant-manager-header'
    header.innerHTML = `
      <h3>Participants (${currentParticipants.length}/8)</h3>
      <p>Each participant will assess probabilities and set their maximum bet amount.</p>
    `
    container.appendChild(header)

    // Create participants list
    const participantsList = document.createElement('div')
    participantsList.className = 'participants-list'

    currentParticipants.forEach((participant, index) => {
      const participantItem = createParticipantItem(participant, index)
      participantsList.appendChild(participantItem)
    })

    container.appendChild(participantsList)

    // Create controls section
    const controls = document.createElement('div')
    controls.className = 'participant-controls'

    // Add participant button
    const addButton = document.createElement('button')
    addButton.className = 'add-participant-btn'
    addButton.type = 'button'

    if (currentParticipants.length >= MAX_PARTICIPANTS) {
      addButton.disabled = true
      addButton.textContent = 'Max Participants Reached (8/8)'
      addButton.setAttribute('aria-label', 'Cannot add more participants - maximum of 8 reached')
    } else {
      addButton.disabled = false
      addButton.textContent = `Add Participant (${currentParticipants.length}/8)`
      addButton.setAttribute(
        'aria-label',
        `Add a new participant. Currently have ${currentParticipants.length} of maximum 8 participants.`
      )
    }

    addButton.addEventListener('click', addParticipant)
    controls.appendChild(addButton)

    container.appendChild(controls)

    // Show amount in play if requested
    if (props.showAmountInPlay) {
      const amountInPlaySection = createAmountInPlayDisplay()
      container.appendChild(amountInPlaySection)
    }

    // Always call onChange to notify parent of current state
    props.onChange([...currentParticipants])
  }

  // Function to create individual participant item
  const createParticipantItem = (participant: Participant, index: number): HTMLElement => {
    const item = document.createElement('div')
    item.className = 'participant-item'
    item.setAttribute('data-participant-index', index.toString())

    // Participant number and remove button header
    const header = document.createElement('div')
    header.className = 'participant-item-header'

    const participantNumber = document.createElement('span')
    participantNumber.className = 'participant-number'
    participantNumber.textContent = `Participant ${index + 1}`

    const removeButton = document.createElement('button')
    removeButton.className = 'remove-participant-btn'
    removeButton.type = 'button'
    removeButton.innerHTML = '×'
    removeButton.setAttribute('aria-label', `Remove participant ${index + 1} (${participant.name})`)

    // Disable remove button if at minimum participants
    if (currentParticipants.length <= MIN_PARTICIPANTS) {
      removeButton.disabled = true
      removeButton.setAttribute(
        'title',
        `Cannot remove - minimum ${MIN_PARTICIPANTS} participants required`
      )
    } else {
      removeButton.addEventListener('click', () => removeParticipant(index))
    }

    header.appendChild(participantNumber)
    header.appendChild(removeButton)
    item.appendChild(header)

    // Name input
    const nameGroup = document.createElement('div')
    nameGroup.className = 'input-group'

    const nameLabel = document.createElement('label')
    nameLabel.textContent = 'Name'
    nameLabel.htmlFor = `participant-name-${index}`
    nameLabel.className = 'input-label'

    const nameInput = document.createElement('input')
    nameInput.type = 'text'
    nameInput.id = `participant-name-${index}`
    nameInput.className = 'participant-name text-input'
    nameInput.value = participant.name
    nameInput.setAttribute('aria-label', `Participant ${index + 1} name`)
    nameInput.addEventListener('input', e =>
      updateParticipantName(index, (e.target as HTMLInputElement).value)
    )

    nameGroup.appendChild(nameLabel)
    nameGroup.appendChild(nameInput)
    item.appendChild(nameGroup)

    // Max bet input
    const maxBetGroup = document.createElement('div')
    maxBetGroup.className = 'input-group'

    const maxBetLabel = document.createElement('label')
    maxBetLabel.textContent = 'Maximum Bet'
    maxBetLabel.htmlFor = `participant-max-bet-${index}`
    maxBetLabel.className = 'input-label'

    const maxBetInput = document.createElement('input')
    maxBetInput.type = 'number'
    maxBetInput.id = `participant-max-bet-${index}`
    maxBetInput.className = 'participant-max-bet text-input'
    maxBetInput.value = participant.maxContribution.toString()
    maxBetInput.min = '0'
    maxBetInput.step = '0.01'
    maxBetInput.setAttribute('aria-label', `Maximum bet amount for participant ${index + 1}`)
    maxBetInput.addEventListener('input', e =>
      updateParticipantMaxBet(index, (e.target as HTMLInputElement).value)
    )

    maxBetGroup.appendChild(maxBetLabel)
    maxBetGroup.appendChild(maxBetInput)
    item.appendChild(maxBetGroup)

    return item
  }

  // Function to create amount in play display
  const createAmountInPlayDisplay = (): HTMLElement => {
    const section = document.createElement('div')
    section.className = 'amount-in-play-section'

    const title = document.createElement('h4')
    title.textContent = 'Amount in Play'

    const description = document.createElement('p')
    description.textContent =
      'The amount each participant will contribute to the bet (minimum of all maximum bets).'

    const amountDisplay = document.createElement('div')
    amountDisplay.className = 'amount-in-play'

    const minAmount = calculateAmountInPlay()
    amountDisplay.innerHTML = `<strong>$${minAmount.toFixed(2)}</strong>`

    section.appendChild(title)
    section.appendChild(description)
    section.appendChild(amountDisplay)

    return section
  }

  // Helper function to calculate amount in play (minimum of all max contributions)
  const calculateAmountInPlay = (): number => {
    if (currentParticipants.length === 0) return 0
    return Math.min(...currentParticipants.map(p => p.maxContribution))
  }

  // Event handlers
  const addParticipant = (): void => {
    if (currentParticipants.length >= MAX_PARTICIPANTS) return

    const newParticipant: Participant = {
      name: generateDefaultName(currentParticipants.length),
      maxContribution: 0,
    }

    currentParticipants.push(newParticipant)
    updateDisplay()
    props.onChange(currentParticipants)
  }

  const removeParticipant = (index: number): void => {
    if (currentParticipants.length <= MIN_PARTICIPANTS) {
      // Don't call onChange if we can't actually remove
      return
    }

    currentParticipants.splice(index, 1)
    updateDisplay()
    props.onChange(currentParticipants)
  }

  const updateParticipantName = (index: number, name: string): void => {
    if (index >= 0 && index < currentParticipants.length && currentParticipants[index]) {
      currentParticipants[index].name = name.trim() || `Person ${String.fromCharCode(65 + index)}`
      props.onChange([...currentParticipants])
    }
  }

  const updateParticipantMaxBet = (index: number, value: string): void => {
    if (index >= 0 && index < currentParticipants.length && currentParticipants[index]) {
      const numericValue = parseFloat(value)
      currentParticipants[index].maxContribution =
        isNaN(numericValue) || numericValue < 0 ? 0 : numericValue

      // Update amount in play display if visible
      if (props.showAmountInPlay) {
        const amountDisplay = container.querySelector('.amount-in-play')
        if (amountDisplay) {
          const minAmount = calculateAmountInPlay()
          amountDisplay.innerHTML = `<strong>$${minAmount.toFixed(2)}</strong>`
        }
      }

      props.onChange([...currentParticipants])
    }
  }

  // Initial render
  updateDisplay()

  return container
}
