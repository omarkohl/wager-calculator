import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react'
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-start justify-between">
            <DialogTitle className="text-2xl font-bold text-gray-900">How Wager Works</DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-3">
            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className="flex w-full items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-900 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
                    <span>Why use this app instead of simple even-odds betting?</span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-xs text-gray-700">
                    Traditional even-odds betting (e.g., "loser pays winner $10") only works well
                    for binary outcomes with two participants who strongly disagree. This app
                    handles nuanced situations: multiple participants and outcomes, close
                    predictions (like 60% vs 80% chance of rain), and ensures fair payouts through a
                    proper scoring rule. This means honestly reporting your true belief maximizes
                    your expected payout—no need to exaggerate or hedge your predictions.
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>

            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className="flex w-full items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-900 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
                    <span>Why use Brier scoring?</span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-xs text-gray-700">
                    Brier scoring is a "proper scoring rule," meaning participants maximize their
                    expected payout by reporting their true beliefs. This makes wagers fair and
                    incentivizes honesty.
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>

            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className="flex w-full items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-900 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
                    <span>What if we all predict the same thing?</span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-xs text-gray-700">
                    If all participants have identical predictions, everyone gets the same Brier
                    score. Since payouts are based on differences in scores, all payouts will be
                    zero.
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>

            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className="flex w-full items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-900 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
                    <span>How does the "amount in play" work?</span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-xs text-gray-700">
                    The amount in play is the minimum of all participants' maximum bets. If Alice
                    bets up to $10, Bob up to $15, and Carol up to $20, the amount in play is $10.
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>

            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className="flex w-full items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-900 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
                    <span>Why do my probabilities need to sum to 100%?</span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-xs text-gray-700">
                    Probabilities represent your belief about which outcome will occur. Since
                    exactly one outcome must occur, your probabilities should sum to 100%. The app
                    can normalize them for you if needed.
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>

            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className="flex w-full items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-900 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
                    <span>How are settlements simplified?</span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-xs text-gray-700">
                    After calculating payouts, the app minimizes the number of transactions needed
                    to achieve everyone's net payout. For example, if Alice owes Bob $5 and Bob owes
                    Carol $5, the app simplifies it to Alice pays Carol $5 directly.
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>

            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className="flex w-full items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-900 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
                    <span>Can I bet on more than two outcomes?</span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-xs text-gray-700">
                    Yes! Brier scoring works for any number of mutually exclusive outcomes. Add up
                    to 8 outcomes using the "Add Outcome" button.
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>

            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className="flex w-full items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-900 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
                    <span>Is my data saved?</span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-xs text-gray-700">
                    No data is stored on any server. All calculations happen in your browser. When
                    you share a wager, all the data is encoded in the URL itself.
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>

            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className="flex w-full items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-900 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
                    <span>How does Brier scoring work?</span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-sm text-gray-700">
                    <div className="space-y-4">
                      <p className="text-xs">
                        Brier scoring is a proper scoring rule that incentivizes honest probability
                        assessments. Lower scores are better (0 = perfect, 2 = worst possible).
                      </p>

                      <div>
                        <h4 className="mb-2 text-xs font-semibold">The Formula</h4>
                        <p className="mb-2 text-xs">
                          For each participant, we calculate their Brier score:
                        </p>
                        <div className="rounded bg-gray-100 p-3 font-mono text-xs">
                          BS = (1/N) × Σ(t=1 to N) Σ(i=1 to R) (f_ti - o_ti)²
                        </div>
                        <ul className="mt-2 ml-6 list-disc space-y-1 text-xs">
                          <li>
                            <strong>N</strong> = number of instances (always 1 for a single wager)
                          </li>
                          <li>
                            <strong>R</strong> = number of possible outcomes
                          </li>
                          <li>
                            <strong>f_ti</strong> = predicted probability for outcome i (as decimal,
                            e.g., 0.7 for 70%)
                          </li>
                          <li>
                            <strong>o_ti</strong> = 1 if outcome i occurs, 0 otherwise
                          </li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="mb-2 text-xs font-semibold">Calculating Payouts</h4>
                        <p className="mb-2 text-xs">
                          Payouts reward better predictions relative to other participants:
                        </p>
                        <div className="rounded bg-gray-100 p-3 font-mono text-xs">
                          Payout = (amount_in_play) × (avg_others_brier - my_brier) / 2
                        </div>
                        <p className="mt-2 text-xs">
                          Division by 2 ensures the maximum payout cannot exceed your maximum bet
                          (since the worst possible Brier score is 2).
                        </p>
                      </div>

                      <div>
                        <h4 className="mb-2 text-xs font-semibold">Worked Example</h4>
                        <p className="mb-2 text-xs">
                          Alice and Bob bet on a coin flip (Heads or Tails). Each bets $10.
                        </p>
                        <div className="space-y-2 text-xs">
                          <div>
                            <strong>Predictions:</strong>
                            <ul className="ml-6 list-disc">
                              <li>Alice: 60% Heads, 40% Tails</li>
                              <li>Bob: 50% Heads, 50% Tails</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Outcome:</strong> Heads occurs
                          </div>
                          <div>
                            <strong>Brier Scores:</strong>
                            <ul className="ml-6 list-disc">
                              <li>
                                Alice: (0.6 - 1)² + (0.4 - 0)² = 0.16 + 0.16 = <strong>0.32</strong>
                              </li>
                              <li>
                                Bob: (0.5 - 1)² + (0.5 - 0)² = 0.25 + 0.25 = <strong>0.50</strong>
                              </li>
                            </ul>
                          </div>
                          <div>
                            <strong>Payouts:</strong>
                            <ul className="ml-6 list-disc">
                              <li>Alice: $10 × (0.50 - 0.32) / 2 = $10 × 0.09 = $0.90</li>
                              <li>Bob: $10 × (0.32 - 0.50) / 2 = $10 × -0.09 = -$0.90</li>
                            </ul>
                          </div>
                          <p className="pt-2">
                            Alice predicted Heads with higher confidence and wins $0.90. Bob pays
                            $0.90. The payouts sum to zero.
                          </p>
                        </div>
                      </div>
                    </div>
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
