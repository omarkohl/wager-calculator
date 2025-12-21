import { describe, test, expect } from '@jest/globals'

describe('Jest Setup Test', () => {
  test('should run basic assertions', () => {
    expect(1 + 1).toBe(2)
    expect('hello').toBeTruthy()
    expect(null).toBeFalsy()
  })

  test('should have access to DOM testing utilities', () => {
    document.body.innerHTML = '<div>Test content</div>'
    const element = document.querySelector('div')
    expect(element).not.toBeNull()
    expect(element?.textContent).toBe('Test content')
  })

  test('should handle mathematical calculations', () => {
    const result = 0.1 + 0.2
    expect(result).toBeCloseTo(0.3, 5)
  })

  test('should use custom matchers', () => {
    const value = 5
    expect(value).toBeWithinRange(1, 10)
  })
})
