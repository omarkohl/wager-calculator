/**
 * Test suite for multi-participant management components
 * Following TDD approach - tests written first to define expected behavior
 * Supports 2-8 participants as per specification
 */

import { describe, expect, test, beforeEach, afterEach } from '@jest/globals'
import { Participant } from '../../src/types/index'
import { createParticipantManager } from '../../src/components/participant-management'

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

describe('ParticipantManager Component', () => {
  test('should render with minimum 2 participants by default', () => {
    const participantManager = createParticipantManager({
      participants: [],
      onChange: () => {},
    })

    container.appendChild(participantManager)

    const participantItems = container.querySelectorAll('.participant-item')
    expect(participantItems.length).toBe(2)

    // Should have default names
    const nameInputs = container.querySelectorAll('.participant-name') as NodeListOf<HTMLInputElement>
    expect(nameInputs[0].value).toBe('Person A')
    expect(nameInputs[1].value).toBe('Person B')
  })

  test('should render with provided participants', () => {
    const initialParticipants: Participant[] = [
      { name: 'Alice', maxContribution: 100 },
      { name: 'Bob', maxContribution: 200 },
      { name: 'Carol', maxContribution: 150 },
    ]

    const participantManager = createParticipantManager({
      participants: initialParticipants,
      onChange: () => {},
    })

    container.appendChild(participantManager)

    const participantItems = container.querySelectorAll('.participant-item')
    expect(participantItems.length).toBe(3)

    const nameInputs = container.querySelectorAll('.participant-name') as NodeListOf<HTMLInputElement>
    expect(nameInputs[0].value).toBe('Alice')
    expect(nameInputs[1].value).toBe('Bob')
    expect(nameInputs[2].value).toBe('Carol')

    const maxBetInputs = container.querySelectorAll('.participant-max-bet') as NodeListOf<HTMLInputElement>
    expect(maxBetInputs[0].value).toBe('100')
    expect(maxBetInputs[1].value).toBe('200')
    expect(maxBetInputs[2].value).toBe('150')
  })

  test('should add new participant when add button is clicked', () => {
    let changedParticipants: Participant[] = []
    const onChange = (participants: Participant[]) => {
      changedParticipants = participants
    }

    const participantManager = createParticipantManager({
      participants: [
        { name: 'Alice', maxContribution: 100 },
        { name: 'Bob', maxContribution: 200 },
      ],
      onChange,
    })

    container.appendChild(participantManager)

    const addButton = container.querySelector('.add-participant-btn') as HTMLButtonElement
    expect(addButton).toBeTruthy()
    expect(addButton.textContent).toContain('Add Participant')

    addButton.click()

    expect(changedParticipants.length).toBe(3)
    expect(changedParticipants[2].name).toBe('Person C')
    expect(changedParticipants[2].maxContribution).toBe(0)
  })

  test('should remove participant when remove button is clicked', () => {
    let changedParticipants: Participant[] = []
    const onChange = (participants: Participant[]) => {
      changedParticipants = participants
    }

    const participantManager = createParticipantManager({
      participants: [
        { name: 'Alice', maxContribution: 100 },
        { name: 'Bob', maxContribution: 200 },
        { name: 'Carol', maxContribution: 150 },
      ],
      onChange,
    })

    container.appendChild(participantManager)

    const removeButtons = container.querySelectorAll('.remove-participant-btn') as NodeListOf<HTMLButtonElement>
    expect(removeButtons.length).toBe(3)

    // Click remove button for second participant (Bob)
    removeButtons[1].click()

    expect(changedParticipants.length).toBe(2)
    expect(changedParticipants[0].name).toBe('Alice')
    expect(changedParticipants[1].name).toBe('Carol')
  })

  test('should update participant name when input changes', () => {
    let changedParticipants: Participant[] = []
    const onChange = (participants: Participant[]) => {
      changedParticipants = participants
    }

    const participantManager = createParticipantManager({
      participants: [
        { name: 'Alice', maxContribution: 100 },
        { name: 'Bob', maxContribution: 200 },
      ],
      onChange,
    })

    container.appendChild(participantManager)

    const nameInputs = container.querySelectorAll('.participant-name') as NodeListOf<HTMLInputElement>
    nameInputs[0].value = 'Alice Smith'
    nameInputs[0].dispatchEvent(new Event('input', { bubbles: true }))

    expect(changedParticipants[0].name).toBe('Alice Smith')
    expect(changedParticipants[0].maxContribution).toBe(100) // Should preserve max contribution
  })

  test('should update participant max contribution when input changes', () => {
    let changedParticipants: Participant[] = []
    const onChange = (participants: Participant[]) => {
      changedParticipants = participants
    }

    const participantManager = createParticipantManager({
      participants: [
        { name: 'Alice', maxContribution: 100 },
        { name: 'Bob', maxContribution: 200 },
      ],
      onChange,
    })

    container.appendChild(participantManager)

    const maxBetInputs = container.querySelectorAll('.participant-max-bet') as NodeListOf<HTMLInputElement>
    maxBetInputs[1].value = '300'
    maxBetInputs[1].dispatchEvent(new Event('input', { bubbles: true }))

    expect(changedParticipants[1].name).toBe('Bob') // Should preserve name
    expect(changedParticipants[1].maxContribution).toBe(300)
  })

  test('should enforce minimum of 2 participants', () => {
    let changedParticipants: Participant[] = []
    const onChange = (participants: Participant[]) => {
      changedParticipants = participants
    }

    const participantManager = createParticipantManager({
      participants: [
        { name: 'Alice', maxContribution: 100 },
        { name: 'Bob', maxContribution: 200 },
      ],
      onChange,
    })

    container.appendChild(participantManager)

    const removeButtons = container.querySelectorAll('.remove-participant-btn') as NodeListOf<HTMLButtonElement>
    
    // Try to remove first participant
    removeButtons[0].click()

    // Should still have 2 participants (can't go below minimum)
    expect(changedParticipants.length).toBe(2)
    expect(changedParticipants[0].name).toBe('Alice')
    expect(changedParticipants[1].name).toBe('Bob')

    // Remove buttons should be disabled when at minimum
    const updatedRemoveButtons = container.querySelectorAll('.remove-participant-btn') as NodeListOf<HTMLButtonElement>
    updatedRemoveButtons.forEach(btn => {
      expect(btn.disabled).toBe(true)
    })
  })

  test('should enforce maximum of 8 participants', () => {
    // Start with 7 participants to test the limit
    const initialParticipants: Participant[] = Array.from({ length: 7 }, (_, i) => ({
      name: `Person ${String.fromCharCode(65 + i)}`, // A, B, C, etc.
      maxContribution: (i + 1) * 100,
    }))

    let changedParticipants: Participant[] = []
    const onChange = (participants: Participant[]) => {
      changedParticipants = participants
    }

    const participantManager = createParticipantManager({
      participants: initialParticipants,
      onChange,
    })

    container.appendChild(participantManager)

    const addButton = container.querySelector('.add-participant-btn') as HTMLButtonElement
    
    // Should be able to add one more (to reach 8)
    addButton.click()
    expect(changedParticipants.length).toBe(8)
    expect(changedParticipants[7].name).toBe('Person H')

    // Add button should now be disabled (re-query after component update)
    const updatedAddButton = container.querySelector('.add-participant-btn') as HTMLButtonElement
    expect(updatedAddButton.disabled).toBe(true)
    expect(updatedAddButton.textContent).toContain('Max Participants Reached')
  })

  test('should generate correct default names for new participants', () => {
    let changedParticipants: Participant[] = []
    const onChange = (participants: Participant[]) => {
      changedParticipants = participants
    }

    const participantManager = createParticipantManager({
      participants: [
        { name: 'Alice', maxContribution: 100 },
        { name: 'Bob', maxContribution: 200 },
        { name: 'Carol', maxContribution: 150 },
      ],
      onChange,
    })

    container.appendChild(participantManager)

    const addButton = container.querySelector('.add-participant-btn') as HTMLButtonElement
    
    // Add participants and check default names
    addButton.click() // Should be Person D
    expect(changedParticipants[3].name).toBe('Person D')

    addButton.click() // Should be Person E
    expect(changedParticipants[4].name).toBe('Person E')
  })

  test('should calculate and display amount in play correctly', () => {
    const participantManager = createParticipantManager({
      participants: [
        { name: 'Alice', maxContribution: 100 },
        { name: 'Bob', maxContribution: 200 },
        { name: 'Carol', maxContribution: 150 },
      ],
      onChange: () => {},
      showAmountInPlay: true,
    })

    container.appendChild(participantManager)

    const amountDisplay = container.querySelector('.amount-in-play')
    expect(amountDisplay).toBeTruthy()
    expect(amountDisplay?.textContent).toContain('100') // Minimum of the three amounts
  })

  test('should update amount in play when contributions change', () => {
    let changedParticipants: Participant[] = []
    const onChange = (participants: Participant[]) => {
      changedParticipants = participants
    }

    const participantManager = createParticipantManager({
      participants: [
        { name: 'Alice', maxContribution: 100 },
        { name: 'Bob', maxContribution: 200 },
        { name: 'Carol', maxContribution: 150 },
      ],
      onChange,
      showAmountInPlay: true,
    })

    container.appendChild(participantManager)

    // Change Alice's contribution to 50 (should become new minimum)
    const maxBetInputs = container.querySelectorAll('.participant-max-bet') as NodeListOf<HTMLInputElement>
    maxBetInputs[0].value = '50'
    maxBetInputs[0].dispatchEvent(new Event('input', { bubbles: true }))

    const amountDisplay = container.querySelector('.amount-in-play')
    expect(amountDisplay?.textContent).toContain('50')
  })

  test('should handle invalid max contribution input gracefully', () => {
    let changedParticipants: Participant[] = []
    const onChange = (participants: Participant[]) => {
      changedParticipants = participants
    }

    const participantManager = createParticipantManager({
      participants: [
        { name: 'Alice', maxContribution: 100 },
        { name: 'Bob', maxContribution: 200 },
      ],
      onChange,
    })

    container.appendChild(participantManager)

    const maxBetInputs = container.querySelectorAll('.participant-max-bet') as NodeListOf<HTMLInputElement>
    
    // Test negative value
    maxBetInputs[0].value = '-50'
    maxBetInputs[0].dispatchEvent(new Event('input', { bubbles: true }))
    expect(changedParticipants[0].maxContribution).toBe(0) // Should default to 0

    // Test non-numeric value
    maxBetInputs[0].value = 'invalid'
    maxBetInputs[0].dispatchEvent(new Event('input', { bubbles: true }))
    expect(changedParticipants[0].maxContribution).toBe(0) // Should default to 0
  })

  test('should support accessibility attributes', () => {
    const participantManager = createParticipantManager({
      participants: [
        { name: 'Alice', maxContribution: 100 },
        { name: 'Bob', maxContribution: 200 },
      ],
      onChange: () => {},
    })

    container.appendChild(participantManager)

    // Check that name inputs have proper labels and ARIA attributes
    const nameInputs = container.querySelectorAll('.participant-name') as NodeListOf<HTMLInputElement>
    nameInputs.forEach((input, index) => {
      expect(input.getAttribute('aria-label')).toContain('Participant')
      expect(input.getAttribute('aria-label')).toContain(`${index + 1}`)
    })

    // Check that max bet inputs have proper labels
    const maxBetInputs = container.querySelectorAll('.participant-max-bet') as NodeListOf<HTMLInputElement>
    maxBetInputs.forEach((input, index) => {
      expect(input.getAttribute('aria-label')).toContain('Maximum bet')
      expect(input.getAttribute('aria-label')).toContain(`${index + 1}`)
    })

    // Check that buttons have proper ARIA labels
    const addButton = container.querySelector('.add-participant-btn') as HTMLButtonElement
    expect(addButton.getAttribute('aria-label')).toBeTruthy()

    const removeButtons = container.querySelectorAll('.remove-participant-btn') as NodeListOf<HTMLButtonElement>
    removeButtons.forEach(btn => {
      expect(btn.getAttribute('aria-label')).toBeTruthy()
    })
  })
})

describe('ParticipantManager Integration', () => {
  test('should work with existing TypeScript interfaces', () => {
    const initialParticipants: Participant[] = [
      { name: 'Alice', maxContribution: 100 },
      { name: 'Bob', maxContribution: 200 },
    ]

    // Test that TypeScript interfaces are properly used
    expect(initialParticipants[0]).toHaveProperty('name')
    expect(initialParticipants[0]).toHaveProperty('maxContribution')
    expect(typeof initialParticipants[0].name).toBe('string')
    expect(typeof initialParticipants[0].maxContribution).toBe('number')
  })

  test('should maintain participant order when removing middle participants', () => {
    let changedParticipants: Participant[] = []
    const onChange = (participants: Participant[]) => {
      changedParticipants = participants
    }

    const participantManager = createParticipantManager({
      participants: [
        { name: 'Alice', maxContribution: 100 },
        { name: 'Bob', maxContribution: 200 },
        { name: 'Carol', maxContribution: 150 },
        { name: 'David', maxContribution: 300 },
      ],
      onChange,
    })

    container.appendChild(participantManager)

    const removeButtons = container.querySelectorAll('.remove-participant-btn') as NodeListOf<HTMLButtonElement>
    
    // Remove Bob (index 1)
    removeButtons[1].click()

    expect(changedParticipants.length).toBe(3)
    expect(changedParticipants[0].name).toBe('Alice')
    expect(changedParticipants[1].name).toBe('Carol') // Carol moved up
    expect(changedParticipants[2].name).toBe('David') // David moved up
  })
})

