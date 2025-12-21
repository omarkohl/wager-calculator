/**
 * Test suite for probability input matrix component
 * Following TDD approach - tests written first to define expected behavior
 * Supports 2-8 participants with probability assessments for binary and multi-categorical bets
 */

import { describe, expect, test, beforeEach, afterEach } from '@jest/globals'
import { Participant, BetType } from '../../src/types/index'
import { createProbabilityMatrix, ProbabilityMatrixProps, Category, ProbabilityData } from '../../src/components/probability-matrix'

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

describe('ProbabilityMatrix Component - Binary Bets', () => {
  test('should render binary probability matrix for 2 participants', () => {
    const participants: Participant[] = [
      { name: 'Alice', maxContribution: 100 },
      { name: 'Bob', maxContribution: 200 }
    ]

    const categories = [
      { id: 'yes', name: 'Yes' },
      { id: 'no', name: 'No' }
    ]

    const initialProbabilities: ProbabilityData = {
      'Alice': { 'yes': 70, 'no': 30 },
      'Bob': { 'yes': 40, 'no': 60 }
    }

    const probabilityMatrix = createProbabilityMatrix({
      participants,
      categories,
      betType: BetType.Binary,
      probabilities: initialProbabilities,
      onChange: () => {},
    })

    expect(probabilityMatrix).toBeDefined()
    expect(probabilityMatrix.tagName).toBe('DIV')
    expect(probabilityMatrix.className).toBe('probability-matrix')

    container.appendChild(probabilityMatrix)

    // Check that participant rows exist
    const participantRows = probabilityMatrix.querySelectorAll('.probability-participant-row')
    expect(participantRows).toHaveLength(2)

    // Check that binary categories exist (Yes/No)
    const categoryHeaders = probabilityMatrix.querySelectorAll('.probability-category-header')
    expect(categoryHeaders).toHaveLength(2)
    expect(categoryHeaders[0].textContent).toBe('Yes')
    expect(categoryHeaders[1].textContent).toBe('No')

    // Check that probability input cells exist
    const probabilityInputs = probabilityMatrix.querySelectorAll('.probability-input')
    expect(probabilityInputs).toHaveLength(4) // 2 participants × 2 categories

    // Check that total cells exist
    const totalCells = probabilityMatrix.querySelectorAll('.total-cell')
    expect(totalCells).toHaveLength(2) // One per participant
  })
})