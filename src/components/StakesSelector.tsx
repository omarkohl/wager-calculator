import { useState } from 'react'
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/20/solid'
import { ALL_OPTIONS } from '../utils/stakes'

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
          className="w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-left focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:text-sm"
          displayValue={() => selectedOption?.label || ''}
          onChange={event => setQuery(event.target.value)}
          onFocus={event => event.target.select()}
          placeholder="Select stakes..."
          aria-label="Stakes"
        />
        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
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
