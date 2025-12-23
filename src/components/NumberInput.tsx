import { useState, useRef } from 'react'
import { Input } from '@headlessui/react'
import Decimal from 'decimal.js'

interface NumberInputProps {
  value: Decimal
  onChange: (value: Decimal) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  className?: string
}

export default function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
  className,
}: NumberInputProps) {
  const [editingValue, setEditingValue] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // When not editing, derive display from props. When editing, use local state.
  const displayValue = editingValue !== null ? editingValue : value.toDecimalPlaces(2).toString()

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setEditingValue(value.toDecimalPlaces(2).toString())
    // Select all on focus for easy overwrite
    e.target.select()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setEditingValue(inputValue)

    const parsed = parseFloat(inputValue)
    if (!isNaN(parsed)) {
      onChange(new Decimal(parsed))
    }
  }

  const handleBlur = () => {
    const parsed = parseFloat(editingValue ?? '')
    if (isNaN(parsed) || editingValue === '') {
      onChange(new Decimal(0))
    }
    setEditingValue(null)
  }

  return (
    <Input
      ref={inputRef}
      type="number"
      value={displayValue}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      className={className}
    />
  )
}
