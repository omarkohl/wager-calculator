import { useState, useEffect, useRef } from 'react'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { ChevronUpDownIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { ALL_OPTIONS } from '../utils/stakes'

interface StakesSelectorProps {
  value: string
  onChange: (value: string | null) => void
}

// Helper component to handle dropdown state changes with useEffect
function DropdownStateHandler({
  open,
  searchInputRef,
  onClose,
}: {
  open: boolean
  searchInputRef: React.RefObject<HTMLInputElement | null>
  onClose: () => void
}) {
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus()
    } else if (!open) {
      onClose()
    }
  }, [open, searchInputRef, onClose])

  return null
}

export default function StakesSelector({ value, onChange }: StakesSelectorProps) {
  const [query, setQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedOption = ALL_OPTIONS.find(opt => opt.id === value) || null

  const filteredOptions =
    query === ''
      ? ALL_OPTIONS
      : ALL_OPTIONS.filter(option => {
          const searchLower = query.toLowerCase()
          return (
            option.label.toLowerCase().includes(searchLower) ||
            option.name.toLowerCase().includes(searchLower)
          )
        })

  const groupedOptions = filteredOptions.reduce(
    (acc, option) => {
      if (!acc[option.group]) {
        acc[option.group] = []
      }
      acc[option.group].push(option)
      return acc
    },
    {} as Record<string, typeof ALL_OPTIONS>
  )

  // Handle keyboard events on the listbox to auto-focus search
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // If a printable character is typed and search input exists, focus it
    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      searchInputRef.current &&
      document.activeElement !== searchInputRef.current
    ) {
      searchInputRef.current.focus()
    }
  }

  return (
    <Listbox value={value} onChange={onChange}>
      {({ open }) => (
        <div className="relative" onKeyDown={handleKeyDown}>
          {/* Auto-focus search and reset query when opening/closing */}
          <DropdownStateHandler
            open={open}
            searchInputRef={searchInputRef}
            onClose={() => setQuery('')}
          />

          <ListboxButton
            aria-label="Stakes"
            className="w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-left focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:text-sm"
          >
            <span className="block truncate">{selectedOption?.label || 'Select stakes...'}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </ListboxButton>
          <ListboxOptions className="absolute z-10 mt-1 w-full rounded-md bg-white text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
            {/* Search input - fixed at top, not scrollable */}
            <div className="border-b border-gray-200 bg-white px-3 py-2">
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full rounded-md border border-gray-300 py-1.5 pr-3 pl-9 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="Search..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Scrollable options container */}
            <div className="max-h-60 overflow-auto py-1">
              {Object.entries(groupedOptions).map(([group, options]) => (
                <div key={group}>
                  <div className="bg-gray-50 px-3 py-2 text-xs font-semibold tracking-wide text-gray-700 uppercase">
                    {group}
                  </div>
                  {options.map(option => (
                    <ListboxOption
                      key={option.id}
                      value={option.id}
                      className="relative cursor-pointer px-3 py-2 text-gray-900 select-none data-[focus]:bg-blue-600 data-[focus]:text-white"
                    >
                      <div className="flex flex-col">
                        <span className="block truncate">{option.label}</span>
                        {/* Only show secondary text if it differs from label */}
                        {option.name !== option.label && (
                          <span className="block truncate text-xs text-gray-500 data-[focus]:text-blue-100">
                            {option.name}
                          </span>
                        )}
                      </div>
                    </ListboxOption>
                  ))}
                </div>
              ))}
              {filteredOptions.length === 0 && query !== '' && (
                <div className="px-3 py-2 text-sm text-gray-700">No options found.</div>
              )}
            </div>
          </ListboxOptions>
        </div>
      )}
    </Listbox>
  )
}
