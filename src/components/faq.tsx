import type { ReactNode } from 'react'

export interface FaqEntry {
  id: string
  question: string
  answer: ReactNode
}

function link(href: string, text: string): ReactNode {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline hover:text-blue-800"
    >
      {text}
    </a>
  )
}

const WORKED_EXAMPLE_URL =
  '#v=2&c=How+many+people+will+come+to+the+party%3F&s=usd&pn=Artem%2CBaani%2CChau&pb=50%2C40%2C30&ol=Less+than+5%2CBetween+5+and+10%2CMore+than+10&pp=70%2C20%2C10%2C10%2C80%2C10%2C20%2C60%2C20&r=1'

/**
 * The FAQ in display order. The `id` is part of shareable URLs (`#faq=<id>`),
 * so never rename one.
 */
export const FAQ_ENTRIES = [
  {
    id: 'why-this-app',
    question: 'Why use this app instead of simple 1:1 odds?',
    answer: (
      <>
        Simple 1:1 odds betting (e.g., "loser pays winner $10") only works well for binary outcomes
        with two participants who strongly disagree. This app handles nuanced situations: multiple
        participants and outcomes, close predictions (like 60% vs 80% chance of rain), and ensures
        fair payouts through a proper scoring rule. This means honestly reporting your true belief
        maximizes your expected payout—no need to exaggerate or hedge your predictions.
      </>
    ),
  },
  {
    id: 'why-bet',
    question: 'Why should I bet on my beliefs?',
    answer: (
      <>
        <p className="mb-3">
          Talk is cheap. People often make confident claims not as a true expression of what they
          believe, but to impress others with their certainty. When being wrong costs nothing,
          there's little incentive to think carefully before speaking.
        </p>
        <p>
          Putting something at stake—even something small like cookies or bragging rights—encourages
          more honest and calibrated predictions. It helps us as individuals (and as a society)
          evolve toward thinking and saying more true things. As the saying goes: "Betting is a tax
          on bullshit."
        </p>
      </>
    ),
  },
  {
    id: 'not-gambling',
    question: 'Are you promoting gambling? No.',
    answer: (
      <>
        <p className="mb-3">
          Gambling addiction is something that can destroy lives and is therefore nothing we want to
          encourage! If you may have a compulsive gambling habit please do not use this app. The
          purpose of Wager Calculator is accountability: helping people reflect on the confidence
          behind their claims and predictions. When there's even a small stake involved, people tend
          to moderate outlandish predictions and think more carefully about what they actually
          believe.
        </p>
        <p>
          That being said, you don't have to bet money. This app supports stakes like "cookies,"
          "hugs," or "I was wrong" (meaning the loser must tell the winner "I was wrong!" several
          times). You can even specify something custom using "other" and explain it in the wager
          details.
        </p>
      </>
    ),
  },
  {
    id: 'no-money',
    question: 'Do I have to bet money? No.',
    answer: (
      <p>
        No, you don't have to bet money. This app supports stakes like "cookies," "hugs," or "I was
        wrong" (meaning the loser must tell the winner "I was wrong!" several times). You can even
        specify something custom using "other" and explain it in the wager details.
      </p>
    ),
  },
  {
    id: 'brier-scoring',
    question: 'Why use Brier scoring?',
    answer: (
      <>
        Brier scoring is a "proper scoring rule," meaning participants maximize their expected
        payout by reporting their true beliefs. They will always perform worse if they make a
        prediction that does not match their real belief. This makes wagers fair and incentivizes
        honesty. Note that we use the original definition by Brier (with results between 0 and 2)
        because it's suitable for multi-categorical oucomes whereas the most well known definition
        (with results between 0 and 1) is only applicable to binary outcomes. You can read more
        about scoring rules {link('https://en.wikipedia.org/wiki/Scoring_rule', 'here')}.
      </>
    ),
  },
  {
    id: 'same-predictions',
    question: 'What if we all predict the same thing?',
    answer: (
      <>
        If all participants have identical predictions, everyone gets the same Brier score. Since
        payouts are based on differences in scores, all payouts will be zero.
      </>
    ),
  },
  {
    id: 'different-max-bets',
    question: 'What happens if different participants choose different maximum bets?',
    answer: (
      <>
        The amount used will be the minimum of all participants' maximum bets. If Alice bets up to
        $10, Bob up to $15, and Carol up to $20, the maximum amount any player could lose is $10.
        There are no automatic side bets between different players.
      </>
    ),
  },
  {
    id: 'sum-100',
    question: 'Why do my probabilities need to sum to 100%?',
    answer: (
      <>
        Probabilities represent your belief about which outcome will occur. Since exactly one
        outcome must occur, your probabilities must sum to 100%. The outcomes must be exhaustive
        (i.e. cover all possibilities) and mutually exclusive (i.e. only one of them resolves as
        true). If in doubt you can always add one outcome "Other" for results you did not
        anticipate.
      </>
    ),
  },
  {
    id: 'settlements',
    question: 'How are settlements simplified?',
    answer: (
      <>
        After calculating payouts, the app minimizes the number of transactions needed to achieve
        everyone's net payout. For example, if Alice owes Bob $5 and Bob owes Carol $5, the app
        simplifies it to Alice pays Carol $5 directly.
      </>
    ),
  },
  {
    id: 'multiple-outcomes',
    question: 'Can I bet on more than two outcomes?',
    answer: (
      <>
        Yes! Brier scoring works for any number of mutually exclusive outcomes. Add up to 8 outcomes
        using the "Add Outcome" button.
      </>
    ),
  },
  {
    id: 'continuous-values',
    question: 'Can I wager on continuous values like temperature or a number?',
    answer: (
      <>
        <p className="mb-3">Yes, by dividing the range into buckets.</p>
        <p className="mb-3">
          <strong>Example:</strong> You and a friend disagree on how long a meeting will run. Create
          these outcomes: "Under 30 minutes," "30-45 minutes," "45-60 minutes," and "Over 60
          minutes." Each person assigns probabilities (e.g., you might predict 10% / 40% / 35% /
          15%). When the meeting ends at 52 minutes, the "45-60 minutes" outcome wins and payouts
          are calculated normally.
        </p>
        <p className="mb-3">
          This approach works for any continuous value—just pick bucket boundaries that capture
          meaningful distinctions for your wager.
        </p>
        <p>
          We're considering adding direct support for probability distributions as input. If you'd
          like this feature, please vote or comment{' '}
          {link('https://github.com/omarkohl/wager-calculator/issues/6', 'here')}.
        </p>
      </>
    ),
  },
  {
    id: 'true-belief',
    question: '(Technical) Should I always report my true belief?',
    answer: (
      <>
        <p className="mb-3 italic">
          This is a technical corner case unlikely to affect most users. The short answer: yes,
          report your true belief—especially if participants decide on their predictions and stakes
          independently.
        </p>
        <p className="mb-3">
          Brier scoring maximizes your <em>expected value</em> (EV) when you report honestly.
          However, EV maximization assumes you value each dollar equally—whether it's your first or
          your thousandth. In reality, losing $1,000 often hurts more than winning $1,000 feels
          good. Economists call this "diminishing marginal utility of money."
        </p>
        <p className="mb-3">
          If all these conditions apply, you might rationally deviate from your true belief:
        </p>
        <ul className="mb-3 ml-6 list-disc space-y-1">
          <li>You see your opponent's probabilities and max stake before submitting yours</li>
          <li>Your opponent won't adjust after seeing your submission</li>
          <li>Their max stake exceeds your financial comfort zone</li>
          <li>Avoiding large losses matters more to you than maximizing EV</li>
        </ul>
        <p className="mb-3">
          In such cases, you could increase your stated max stake while slightly shifting your
          probability toward your opponent's—this caps your maximum loss while potentially
          increasing EV compared to a lower stake at your true belief. For more technical details,
          see{' '}
          {link(
            'https://www.lesswrong.com/posts/ic6MjCkFfCecjSHhq/cheating-at-bets-with-the-even-odds-algorithm',
            'this post'
          )}
          .
        </p>
        <p className="mb-2 font-semibold">How to avoid this issue:</p>
        <ul className="ml-6 list-disc space-y-1">
          <li>
            <strong>Keep stakes small or non-monetary.</strong> We recommend this anyway to avoid
            gambling issues. When stakes are small (or things like cookies/bragging rights), the
            marginal utility concern disappears.
          </li>
          <li>
            <strong>Commit to predictions independently.</strong> Make all participants commit to
            predictions and stakes independently before revealing them. This removes the information
            asymmetry that enables the exploit.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'different-payouts',
    question: 'Why are payouts different for different resolutions? Is that fair?',
    answer: (
      <>
        <p className="mb-3">
          This is exactly how Brier scoring works—and it's what makes it fair. Your payout depends
          on how accurate your prediction was relative to other participants, not on which outcome
          occurs.
        </p>
        <p className="mb-3">
          If you assigned a high probability to an outcome that actually happened, your Brier score
          will be low (good). If you assigned low probability to what happened, your score will be
          high (bad). The difference between your score and everyone else's average determines your
          payout.
        </p>
        <p className="mb-3">
          This means different resolutions produce different payouts because they reward different
          predictions. If Alice predicted 80% for outcome A and Bob predicted 40%, one of them will
          be proven more accurate when we see which outcome occurs—and the payouts reflect that.
        </p>
        <p>
          Note that every participant has a positive expected value by their own beliefs. Multiply
          the probability a participant assigns to each outcome by what they win or lose on that
          resolution, add it all up, and the result is never negative. With two participants it is
          even the same amount for both. That's why it's fair. Use "Preview payouts for each
          outcome" under Resolution to see this for your own wager.
        </p>
      </>
    ),
  },
  {
    id: 'expected-value',
    question: 'What is expected value (EV)?',
    answer: (
      <>
        <p className="mb-3">
          Expected value is what you would win or lose on average if the wager were repeated many
          times. Take each possible resolution, multiply your payout for it by how likely you think
          it is, and add everything up.
        </p>
        <p className="mb-3">
          <strong>Example:</strong> Alice says 70% Yes and Bob says 40% Yes, with $10 in play. If
          Yes happens Alice wins $2.70, if No happens she loses $3.30. Her expected value is 0.7 ×
          2.70 + 0.3 × (−3.30) = +$0.90. Bob, by his own probabilities, also expects +$0.90: 0.4 ×
          (−2.70) + 0.6 × 3.30.
        </p>
        <p className="mb-3">
          Both can expect to come out ahead at the same time because expected value is computed from
          each person's <em>own</em> beliefs. Only one of them is actually closer to the truth, and
          that person will tend to win.
        </p>
        <p>
          Brier scoring is designed so that your expected value is highest when you report exactly
          what you believe. Any other report lowers it by (amount in play / 2) × the squared
          distance between your report and your belief. Use "Preview payouts for each outcome" under
          Resolution to see the expected values for your wager and to try shading a prediction.
        </p>
      </>
    ),
  },
  {
    id: 'same-ev-different-beliefs',
    question: 'How can everyone expect to win at the same time?',
    answer: (
      <>
        <p className="mb-3">
          They can all be right—about their expected value! Expected value is calculated based on{' '}
          <em>your own beliefs</em>, not on some objective "true" probability.
        </p>
        <p className="mb-3">
          If you believe there's a 60% chance of rain and I believe there's an 80% chance, we're
          both acting rationally based on our different information or interpretations. If you think
          your 60% prediction is incorrect then fix it, either increase or decrease it! Everyone who
          reports their honest belief has a positive EV (expected value); with two participants it
          is even the same amount for both. This doesn't mean everyone is equally correct—it means
          everyone is equally incentivized to be honest.
        </p>
        <p>
          After the outcome is revealed, we'll see whose prediction was actually better. The person
          who was more accurate gets paid, but beforehand, everyone expects to come out ahead by
          their own lights.
        </p>
      </>
    ),
  },
  {
    id: 'probability-meaning',
    question: 'How can you assign a probability to a single event?',
    answer: (
      <>
        <p className="mb-3">
          Probability here represents your confidence or degree of belief, not a frequency. When you
          say "40% chance Tom wins the election," you're expressing your uncertainty given the
          information you have.
        </p>
        <p className="mb-3">
          Think of it this way: if you take all your bets where you assign 40% probability then you
          expect to win 40% of those bets. Or more practically: saying 40% means you'd consider it
          roughly fair if someone offered you 3:2 odds ($2 bet pays $5 total if Tom wins the
          election).
        </p>
        <p className="mb-3">
          Probabilities aren't just for repeatable events like coin flips. They're a useful way to
          quantify uncertainty about anything—elections, one-time negotiations, whether your friend
          will arrive on time. Being precise about your uncertainty (40% rather than "maybe") helps
          you think more clearly and makes your predictions falsifiable.
        </p>
        <p>
          This interpretation of probability is called <i>Bayesian</i> probability. It can be
          applied to anything, even situations where for many people <i>Frequentist</i> probability
          seems more intuitive, like the probability of gettings heads on the flip of a fair coin.
          The probability is 50% both because it's the proportion of heads that will turn up in the
          long run and because it's the strength of your belief that the next flip will turn up
          heads.
        </p>
      </>
    ),
  },
  {
    id: 'data-storage',
    question: 'Is my data stored on the server? No.',
    answer: (
      <>
        No data is stored on any server. All calculations happen in your browser. When you share a
        wager, all the data is encoded in the URL itself.
      </>
    ),
  },
  {
    id: 'sharing',
    question: 'How does sharing work?',
    answer: (
      <>
        All data is compressed and stored in the URL anchor (the part after #), which never leaves
        your browser or gets sent to any server. When you share the URL (e.g. via a messenger app),
        others see exactly what you see. If they make changes, they'll have a new URL to share back
        with you—nothing is synced automatically since there's no server storage.
      </>
    ),
  },
  {
    id: 'calculation',
    question: 'How exactly is everything calculated?',
    answer: (
      <div className="space-y-4">
        <p className="text-sm">
          Brier scoring is a proper scoring rule that incentivizes honest probability assessments.
          Lower scores mean "better prediction" (0 = perfect, 2 = worst possible). Note that we use
          the original definition by Brier (with results between 0 and 2) because it's suitable for
          multi-categorical oucomes whereas the most well known definition (with results between 0
          and 1) is only applicable to binary outcomes. You can read more about scoring rules{' '}
          {link('https://en.wikipedia.org/wiki/Scoring_rule', 'here')}.
        </p>

        <div>
          <h4 className="mb-2 text-sm font-semibold">The Formula</h4>
          <p className="mb-2 text-sm">For each participant, we calculate their Brier score:</p>
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
              <strong>f_ti</strong> = predicted probability for outcome i (as decimal, e.g., 0.7 for
              70%)
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
            Division by 2 ensures the maximum payout cannot exceed your maximum bet (since the worst
            possible Brier score is 2).
          </p>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold">Worked Example</h4>
          <p className="mb-2 text-sm">
            Artem, Baani and Chau are hosting a party and they disagree in their predictions how
            many people will attend.
          </p>
          <p className="mb-2 text-sm">
            Artem is willing to bet a max of $50, Baani $40 and Chau $30, therefore the amount that
            is used is $30 (the minimum of all participants).
          </p>
          <p className="mb-2 text-sm">
            They classify their prediction into three buckets "Less than 5 guests", "Between 5 and
            10 guests" and "More than 10 guests".
          </p>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Predictions:</strong>
              <ul className="ml-6 list-disc">
                <li>Artem: 70% less than 5 guests, 20% 5-10 guests and 10% more than 10 guests.</li>
                <li>Baani: 10% less than 5 guests, 80% 5-10 guests and 10% more than 10 guests.</li>
                <li>Chau: 20% less than 5 guests, 60% 5-10 guests and 20% more than 10 guests.</li>
              </ul>
            </div>
            <div>
              <strong>Outcome:</strong> 9 people come to the party.
            </div>
            <div>
              <strong>Brier Scores:</strong>
              <ul className="ml-6 list-disc">
                <li>
                  Artem: (0.70 - 0)² + (0.20 - 1)² + (0.10 - 0)² = 0.49 + 0.64 + 0.01 ={' '}
                  <strong>1.14</strong>
                </li>
                <li>
                  Baani: (0.10 - 0)² + (0.80 - 1)² + (0.10 - 0)² = 0.01 + 0.04 + 0.01 ={' '}
                  <strong>0.06</strong>
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
              Baani had the best (lowest) Brier score and receives $9.45; Chau receives $5.40. Artem
              had the worst (highest) Brier score and pays out to both of them.
            </p>
          </div>
          <div>
            <p className="pt-2">
              See this example in action: {link(WORKED_EXAMPLE_URL, 'Open interactive example')}
            </p>
          </div>
        </div>
      </div>
    ),
  },
] as const satisfies readonly FaqEntry[]

export type FaqId = (typeof FAQ_ENTRIES)[number]['id']

export const FAQ_IDS: readonly FaqId[] = FAQ_ENTRIES.map(entry => entry.id)

export function isFaqId(value: string | null | undefined): value is FaqId {
  return value != null && (FAQ_IDS as readonly string[]).includes(value)
}
