import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react'
import { ChevronDownIcon, XMarkIcon, LinkIcon } from '@heroicons/react/24/outline'
import { FAQ_ENTRIES, type FaqId } from './faq'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
  openFaqId?: FaqId | null
}

export default function HelpModal({ isOpen, onClose, openFaqId }: HelpModalProps) {
  const questionRefs = useRef<Partial<Record<FaqId, HTMLButtonElement | null>>>({})
  const [copiedFaqId, setCopiedFaqId] = useState<FaqId | null>(null)

  // Scroll to the requested question once the modal and its disclosures have rendered
  useEffect(() => {
    if (isOpen && openFaqId && questionRefs.current[openFaqId]) {
      const timer = setTimeout(() => {
        questionRefs.current[openFaqId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, openFaqId])

  // Clear copied state after a delay
  useEffect(() => {
    if (copiedFaqId) {
      const timer = setTimeout(() => setCopiedFaqId(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [copiedFaqId])

  const handleCopyLink = async (faqId: FaqId, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent disclosure toggle
    const url = `${window.location.origin}${window.location.pathname}#faq=${faqId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedFaqId(faqId)
    } catch (error) {
      console.error('Failed to copy FAQ link:', error)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-start justify-between">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Frequently Asked Questions
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close help dialog"
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-3">
            {FAQ_ENTRIES.map(entry => (
              <Disclosure key={entry.id} defaultOpen={openFaqId === entry.id}>
                {({ open }) => (
                  <>
                    <div className="group flex w-full items-center justify-between rounded-lg bg-blue-50 text-left text-sm font-medium text-blue-900">
                      <DisclosureButton
                        ref={el => {
                          questionRefs.current[entry.id] = el
                        }}
                        className="flex flex-1 items-center justify-between px-4 py-3 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                      >
                        <span className="text-left">{entry.question}</span>
                        <ChevronDownIcon
                          className={`h-5 w-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                      </DisclosureButton>
                      <button
                        type="button"
                        onClick={e => handleCopyLink(entry.id, e)}
                        className="mr-2 rounded p-1 text-blue-400 transition-colors hover:bg-blue-200 hover:text-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        aria-label="Copy link to this question"
                        title={copiedFaqId === entry.id ? 'Copied!' : 'Copy link'}
                      >
                        <LinkIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <DisclosurePanel className="px-4 pt-3 pb-3 text-sm text-gray-700">
                      {entry.answer}
                    </DisclosurePanel>
                  </>
                )}
              </Disclosure>
            ))}
          </div>
        </DialogPanel>
      </div>

      {/* Toast for copied confirmation */}
      {copiedFaqId && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
          Link copied to clipboard
        </div>
      )}
    </Dialog>
  )
}
