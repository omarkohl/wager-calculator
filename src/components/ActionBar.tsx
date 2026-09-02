import { QuestionMarkCircleIcon, ArrowPathIcon, ShareIcon } from '@heroicons/react/24/outline'

interface ActionBarProps {
  /** Rendered once above and once below the form; the label suffix keeps the two apart */
  position: 'top' | 'bottom'
  onOpenFaq: () => void
  onReset: () => void
  onShare: () => void
}

const BUTTON_BASE =
  'inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none sm:gap-2 sm:px-4 sm:py-2 sm:text-sm'
const ICON = 'h-4 w-4 sm:h-5 sm:w-5'

export default function ActionBar({ position, onOpenFaq, onReset, onShare }: ActionBarProps) {
  return (
    <div className={`flex justify-end gap-2 sm:gap-3 ${position === 'top' ? 'mb-6' : 'mt-6'}`}>
      <button
        type="button"
        onClick={onOpenFaq}
        aria-label={`Open FAQ (${position})`}
        className={`${BUTTON_BASE} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`}
      >
        <QuestionMarkCircleIcon className={ICON} aria-hidden="true" />
        FAQ
      </button>
      <button
        type="button"
        onClick={onReset}
        aria-label={`Reset form (${position})`}
        className={`${BUTTON_BASE} border border-red-300 bg-white text-red-600 hover:bg-red-50 focus:ring-red-500`}
      >
        <ArrowPathIcon className={ICON} aria-hidden="true" />
        Reset
      </button>
      <button
        type="button"
        onClick={onShare}
        aria-label={`Share wager (${position})`}
        className={`${BUTTON_BASE} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`}
      >
        <ShareIcon className={ICON} aria-hidden="true" />
        Share
      </button>
    </div>
  )
}
