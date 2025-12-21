import { useState } from 'react'
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react'

const CURRENCY_OPTIONS = [
  { id: 'usd', label: 'USD ($)', group: 'Currencies' },
  { id: 'eur', label: 'EUR (€)', group: 'Currencies' },
  { id: 'gbp', label: 'GBP (£)', group: 'Currencies' },
  { id: 'cad', label: 'CAD ($)', group: 'Currencies' },
  { id: 'aud', label: 'AUD ($)', group: 'Currencies' },
  { id: 'jpy', label: 'JPY (¥)', group: 'Currencies' },
  { id: 'chf', label: 'CHF (Fr)', group: 'Currencies' },
  { id: 'cny', label: 'CNY (¥)', group: 'Currencies' },
]

const FUN_OPTIONS = [
  { id: 'cookies', label: 'Cookies', group: 'Fun' },
  { id: 'hugs', label: 'Hugs', group: 'Fun' },
  { id: 'i-was-wrong', label: 'I was wrong', group: 'Fun' },
]

const OTHER_OPTION = { id: 'other', label: 'Other', group: 'Other' }

const ALL_OPTIONS = [...CURRENCY_OPTIONS, ...FUN_OPTIONS, OTHER_OPTION]

interface StakesSelectorProps {
  value: string
  onChange: (value: string | null) => void
}

export default function StakesSelector({ value, onChange }: StakesSelectorProps) {
  const [query, setQuery] = useState('')

  const selectedOption = ALL_OPTIONS.find(opt => opt.id === value) || null

  const filteredOptions =
    query === ''
      ? ALL_OPTIONS
      : ALL_OPTIONS.filter(option => option.label.toLowerCase().includes(query.toLowerCase()))

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

  return (
    <Combobox value={value} onChange={onChange} immediate>
      <div className="relative">
        <ComboboxInput
          className="w-full cursor-pointer appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-left shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:text-sm"
          displayValue={() => selectedOption?.label || ''}
          onChange={event => setQuery(event.target.value)}
          onFocus={event => event.target.select()}
          placeholder="Select stakes..."
          aria-label="Stakes"
        />
        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-3">
          <svg
            className="h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </ComboboxButton>
        <ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
          {Object.entries(groupedOptions).map(([group, options]) => (
            <div key={group}>
              <div className="bg-gray-50 px-3 py-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                {group}
              </div>
              {options.map(option => (
                <ComboboxOption
                  key={option.id}
                  value={option.id}
                  className="relative cursor-pointer px-3 py-2 text-gray-900 select-none data-[focus]:bg-blue-600 data-[focus]:text-white"
                >
                  {option.label}
                </ComboboxOption>
              ))}
            </div>
          ))}
          {filteredOptions.length === 0 && query !== '' && (
            <div className="px-3 py-2 text-sm text-gray-500">No options found.</div>
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  )
}
