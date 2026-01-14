import { useState, useEffect, useRef } from 'react'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { ChevronUpDownIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/20/solid'
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
    if (open) {
      // Use setTimeout to override Headless UI's focus management
      const timeoutId = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 0)
      return () => clearTimeout(timeoutId)
    } else {
      onClose()
    }
  }, [open, searchInputRef, onClose])

  return null
}

export default function StakesSelector({ value, onChange }: StakesSelectorProps) {
  const [query, setQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listboxButtonRef = useRef<HTMLButtonElement>(null)
  const optionsContainerRef = useRef<HTMLDivElement>(null)

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
        <div className="relative max-w-xs" onKeyDown={handleKeyDown}>
          {/* Auto-focus search and reset query when opening/closing */}
          <DropdownStateHandler
            open={open}
            searchInputRef={searchInputRef}
            onClose={() => setQuery('')}
          />

          <ListboxButton
            ref={listboxButtonRef}
            aria-label="Stakes"
            className="relative w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-left focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:text-sm"
          >
            <span className="block truncate">
              {selectedOption ? (
                <>
                  {selectedOption.group === 'Non-monetary' && (
                    <span className="mr-2">{selectedOption.symbol}</span>
                  )}
                  {selectedOption.label}
                </>
              ) : (
                'Select stakes...'
              )}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </ListboxButton>

          {/* Mobile: full-height bottom sheet, Desktop: dropdown */}
          <ListboxOptions className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col bg-white text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:absolute sm:inset-x-auto sm:top-full sm:bottom-auto sm:left-0 sm:z-10 sm:mt-1 sm:h-auto sm:max-h-60 sm:w-full sm:max-w-sm sm:rounded-md sm:text-sm">
            {/* Mobile header with close button - hidden on desktop */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 sm:hidden">
              <div className="flex-1 text-center">
                <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-gray-300"></div>
                <span className="text-sm font-medium text-gray-900">Select Stakes</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  // Close the listbox by simulating Escape key
                  const escapeEvent = new KeyboardEvent('keydown', {
                    key: 'Escape',
                    code: 'Escape',
                    keyCode: 27,
                    bubbles: true,
                  })
                  document.activeElement?.dispatchEvent(escapeEvent)
                }}
                className="rounded-md p-1 text-gray-400 hover:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            {/* Search input - fixed at top, not scrollable */}
            <div className="shrink-0 border-b border-gray-200 bg-white px-3 py-2 sm:rounded-t-md">
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
                  onKeyDown={e => {
                    // Clear search on Escape if there's text, otherwise let it close the listbox
                    if (e.key === 'Escape') {
                      if (query !== '') {
                        e.stopPropagation()
                        setQuery('')
                        return
                      }
                      // Let Escape bubble up to close the listbox
                      return
                    }
                    // Tab closes dropdown and moves to next element
                    if (e.key === 'Tab') {
                      // Let Tab bubble up to close the listbox and move focus
                      return
                    }
                    // Allow arrow keys to bubble up for Headless UI navigation
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                      return
                    }
                    // Allow Enter to select the highlighted option
                    if (e.key === 'Enter') {
                      return
                    }
                    // Stop other keys from affecting the listbox
                    e.stopPropagation()
                  }}
                />
              </div>
            </div>

            {/* Scrollable options container */}
            <div
              key={`options-${filteredOptions.length}-${query}`}
              ref={optionsContainerRef}
              className="flex-1 overflow-auto py-1"
            >
              {Object.entries(groupedOptions).map(([group, options]) => (
                <div key={group}>
                  <div className="bg-gray-50 px-3 py-2 text-xs font-semibold tracking-wide text-gray-700 uppercase">
                    {group}
                  </div>
                  {options.map(option => (
                    <ListboxOption
                      key={option.id}
                      value={option.id}
                      className="relative cursor-pointer px-3 py-2 text-gray-900 select-none data-[focus]:bg-blue-100 data-[focus]:text-blue-900"
                    >
                      <div className="flex flex-col">
                        <span className="block truncate">
                          {/* Only show emoji prefix for non-monetary (currencies already have symbol in label) */}
                          {option.group === 'Non-monetary' && (
                            <span className="mr-3">{option.symbol}</span>
                          )}
                          {option.label}
                        </span>
                        {/* Only show secondary text if it differs from label */}
                        {option.name !== option.label && (
                          <span className="block truncate text-xs text-gray-500 data-[focus]:text-blue-700">
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
