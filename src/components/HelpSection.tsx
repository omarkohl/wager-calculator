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
              aria-label="Close help dialog"
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-3">
            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className="flex w-full items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-900 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
                    <span>Why use this app instead of simple 1:1 odds?</span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-sm text-gray-700">
                    Simple 1:1 odds betting (e.g., "loser pays winner $10") only works well for
                    binary outcomes with two participants who strongly disagree. This app handles
                    nuanced situations: multiple participants and outcomes, close predictions (like
                    60% vs 80% chance of rain), and ensures fair payouts through a proper scoring
                    rule. This means honestly reporting your true belief maximizes your expected
                    payout—no need to exaggerate or hedge your predictions.
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>

            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className="flex w-full items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-900 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
                    <span>Why should I bet on my beliefs?</span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-sm text-gray-700">
                    <p className="mb-3">
                      Talk is cheap. People often make confident claims not as a true expression of
                      what they believe, but to impress others with their certainty. When being
                      wrong costs nothing, there's little incentive to think carefully before
                      speaking.
                    </p>
                    <p>
                      Putting something at stake—even something small like cookies or bragging
                      rights—encourages more honest and calibrated predictions. It helps us as
                      individuals (and as a society) evolve toward thinking and saying more true
                      things. As the saying goes: "Betting is a tax on bullshit."
                    </p>
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>

            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className="flex w-full items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-900 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
                    <span>Are you promoting gambling? No.</span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-sm text-gray-700">
                    <p className="mb-3">
                      Gambling addiction is something that can destroy lives and is therefore
                      nothing we want to encourage! If you may have a compulsive gambling habit
                      please do not use this app. The purpose of Wager Calculator is accountability:
                      helping people reflect on the confidence behind their claims and predictions.
                      When there's even a small stake involved, people tend to moderate outlandish
                      predictions and think more carefully about what they actually believe.
                    </p>
                    <p>
                      That being said, you don't have to bet money. This app supports stakes like
                      "cookies," "hugs," or "I was wrong" (meaning the loser must tell the winner "I
                      was wrong!" several times). You can even specify something custom using
                      "other" and explain it in the wager details.
                    </p>
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>

            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className="flex w-full items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-900 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
                    <span>Do I have to bet money? No.</span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-sm text-gray-700">
                    <p>
                      No, you don't have to bet money. This app supports stakes like "cookies,"
                      "hugs," or "I was wrong" (meaning the loser must tell the winner "I was
                      wrong!" several times). You can even specify something custom using "other"
                      and explain it in the wager details.
                    </p>
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
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-sm text-gray-700">
                    Brier scoring is a "proper scoring rule," meaning participants maximize their
                    expected payout by reporting their true beliefs. They will always perform worse
                    if they make a prediction that does not match their real belief. This makes
                    wagers fair and incentivizes honesty. Note that we use the original definition
                    by Brier (with results between 0 and 2) because it's suitable for
                    multi-categorical oucomes whereas the most well known definition (with results
                    between 0 and 1) is only applicable to binary outcomes. You can read more about
                    scoring rules{' '}
                    <a
                      href="https://en.wikipedia.org/wiki/Scoring_rule"
                      target="_blank"
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      here
                    </a>
                    .
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
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-sm text-gray-700">
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
                    <span>
                      What happens if different participants choose different maximum bets?
                    </span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-sm text-gray-700">
                    The amount used will be the minimum of all participants' maximum bets. If Alice
                    bets up to $10, Bob up to $15, and Carol up to $20, the maximum amount any
                    player could lose is $10. There are no automatic side bets between different
                    players.
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
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-sm text-gray-700">
                    Probabilities represent your belief about which outcome will occur. Since
                    exactly one outcome must occur, your probabilities must sum to 100%. The
                    outcomes must be exhaustive (i.e. cover all possibilities) and mutually
                    exclusive (i.e. only one of them resolves as true). If in doubt you can always
                    add one outcome "Other" for results you did not anticipate.
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
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-sm text-gray-700">
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
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-sm text-gray-700">
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
                    <span>Is my data stored on the server? No.</span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-sm text-gray-700">
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
                    <span>How does sharing work?</span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-sm text-gray-700">
                    All data is compressed and stored in the URL anchor (the part after #), which
                    never leaves your browser or gets sent to any server. When you share the URL
                    (e.g. via a messenger app), others see exactly what you see. If they make
                    changes, they'll have a new URL to share back with you—nothing is synced
                    automatically since there's no server storage.
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>

            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className="flex w-full items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-900 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
                    <span>How exactly is everything calculated?</span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pt-3 pb-3 text-sm text-gray-700">
                    <div className="space-y-4">
                      <p className="text-sm">
                        Brier scoring is a proper scoring rule that incentivizes honest probability
                        assessments. Lower scores mean "better prediction" (0 = perfect, 2 = worst
                        possible). Note that we use the original definition by Brier (with results
                        between 0 and 2) because it's suitable for multi-categorical oucomes whereas
                        the most well known definition (with results between 0 and 1) is only
                        applicable to binary outcomes. You can read more about scoring rules{' '}
                        <a
                          href="https://en.wikipedia.org/wiki/Scoring_rule"
                          target="_blank"
                          className="text-blue-600 underline hover:text-blue-800"
                        >
                          here
                        </a>
                        .
                      </p>

                      <div>
                        <h4 className="mb-2 text-sm font-semibold">The Formula</h4>
                        <p className="mb-2 text-sm">
                          For each participant, we calculate their Brier score:
                        </p>
                        <div className="rounded bg-gray-100 p-3 font-mono text-xs">
                          BS = (1/N) × Σ(t=1 to N) Σ(i=1 to R) (f_ti - o_ti)²
                        </div>
                        <ul className="mt-2 ml-6 list-disc space-y-1 text-sm">
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
                        <h4 className="mb-2 text-sm font-semibold">Calculating Payouts</h4>
                        <p className="mb-2 text-sm">
                          Payouts reward better predictions relative to other participants:
                        </p>
                        <div className="rounded bg-gray-100 p-3 font-mono text-xs">
                          Payout = (amount_in_play) × (avg_others_brier - my_brier) / 2
                        </div>
                        <p className="mt-2 text-sm">
                          Division by 2 ensures the maximum payout cannot exceed your maximum bet
                          (since the worst possible Brier score is 2).
                        </p>
                      </div>

                      <div>
                        <h4 className="mb-2 text-sm font-semibold">Worked Example</h4>
                        <p className="mb-2 text-sm">
                          Artem, Baani and Chau are hosting a party and they disagree in their
                          predictions how many people will attend.
                        </p>
                        <p className="mb-2 text-sm">
                          Artem is willing to bet a max of $50, Baani $40 and Chau $30, therefore
                          the amount that is used is $30 (the minimum of all participants).
                        </p>
                        <p className="mb-2 text-sm">
                          They classify their prediction into three buckets "Less than 5 guests",
                          "Between 5 and 10 guests" and "More than 10 guests".
                        </p>
                        <div className="space-y-2 text-sm">
                          <div>
                            <strong>Predictions:</strong>
                            <ul className="ml-6 list-disc">
                              <li>
                                Artem: 70% less than 5 guests, 20% 5-10 guests and 10% more than 10
                                guests.
                              </li>
                              <li>
                                Baani: 10% less than 5 guests, 80% 5-10 guests and 10% more than 10
                                guests.
                              </li>
                              <li>
                                Chau: 20% less than 5 guests, 60% 5-10 guests and 20% more than 10
                                guests.
                              </li>
                            </ul>
                          </div>
                          <div>
                            <strong>Outcome:</strong> 9 people come to the party.
                          </div>
                          <div>
                            <strong>Brier Scores:</strong>
                            <ul className="ml-6 list-disc">
                              <li>
                                Artem: (0.70 - 0)² + (0.20 - 1)² + (0.10 - 0)² = 0.49 + 0.64 + 0.01
                                = <strong>1.14</strong>
                              </li>
                              <li>
                                Baani: (0.10 - 0)² + (0.80 - 1)² + (0.10 - 0)² = 0.01 + 0.04 + 0.01
                                = <strong>0.06</strong>
                              </li>
                              <li>
                                Chau: (0.20 - 0)² + (0.60 - 1)² + (0.20 - 0)² = 0.04 + 0.16 + 0.04 ={' '}
                                <strong>0.24</strong>
                              </li>
                            </ul>
                          </div>
                          <div>
                            <strong>Payouts:</strong>
                            <ul className="ml-6 list-disc">
                              <li>Artem: $30 × (0.15 - 1.14) / 2 = $30 × -0.495 = -$14.85</li>
                              <li>Baani: $30 × (0.69 - 0.06) / 2 = $30 × 0.315 = $9.45</li>
                              <li>Chau: $30 × (0.60 - 0.24) / 2 = $30 × 0.18 = $5.40</li>
                            </ul>
                          </div>
                          <p className="pt-2">
                            Baani had the best (lowest) Brier score and receives $9.45; Chau
                            receives $5.40. Artem had the worst (highest) Brier score and pays out
                            to both of them.
                          </p>
                        </div>
                        <div>
                          <p className="pt-2">
                            See this example in action:{' '}
                            <a
                              href="#v=2&c=How+many+people+will+come+to+the+party%3F&s=usd&pn=Artem%2CBaani%2CChau&pb=50%2C40%2C30&ol=Less+than+5%2CBetween+5+and+10%2CMore+than+10&pp=70%2C20%2C10%2C10%2C80%2C10%2C20%2C60%2C20&r=1"
                              target="_blank"
                              className="text-blue-600 underline hover:text-blue-800"
                            >
                              Open interactive example
                            </a>
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
