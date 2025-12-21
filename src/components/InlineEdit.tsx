import { useState, useRef, useEffect } from 'react'

interface InlineEditProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
  className?: string
  displayClassName?: string
}

export default function InlineEdit({
  value,
  onChange,
  placeholder = 'Click to edit',
  multiline = false,
  className = '',
  displayClassName = '',
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      if (!multiline) {
        ;(inputRef.current as HTMLInputElement).select()
      }
    }
  }, [isEditing, multiline])

  const handleClick = () => {
    setEditValue(value)
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    onChange(editValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      handleBlur()
    } else if (e.key === 'Escape') {
      setEditValue(value)
      setIsEditing(false)
    }
  }

  const handleDisplayKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Start editing on any printable character
      setEditValue('')
      setIsEditing(true)
    }
  }

  if (isEditing) {
    const commonProps = {
      value: editValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setEditValue(e.target.value),
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      className: `w-full rounded border border-blue-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`,
    }

    if (multiline) {
      return (
        <textarea
          {...commonProps}
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          rows={3}
        />
      )
    }

    return <input {...commonProps} ref={inputRef as React.RefObject<HTMLInputElement>} />
  }

  const displayText = value || placeholder
  const isPlaceholder = !value

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleDisplayKeyDown}
      tabIndex={0}
      role="button"
      aria-label={placeholder}
      className={`cursor-text rounded px-3 py-2 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none ${displayClassName} ${
        isPlaceholder ? 'text-gray-400' : ''
      }`}
    >
      {displayText}
    </div>
  )
}
