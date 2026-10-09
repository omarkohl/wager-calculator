import type { FaqEntry } from '../faq'

/**
 * The FAQ of the belief elicitation. The `id` is part of shareable URLs
 * (`/elicit#faq=<id>`), so never rename one.
 */
export const ELICIT_FAQ_ENTRIES = [
  {
    id: 'how-it-works',
    question: 'How does it work?',
    answer: (
      <>
        <p className="mb-3">
          You are asked, again and again, which you would rather have: win a prize if the claim
          turns out true, or win the same prize if a spinner lands in a shaded part that wins, say,
          40% of the time. Because the prize is the same either way, only your sense of how likely
          the claim is can decide. Prefer the claim and you think it is more likely than 40%; prefer
          the spinner and you think it is less likely.
        </p>
        <p className="mb-3">
          The shaded part moves until the tool finds where you stop being sure which you prefer, and
          the stretch in between is your range. &ldquo;I can&rsquo;t separate these&rdquo; is an
          honest answer: it sends the search further out, it does not end it.
        </p>
        <p>
          A quick run takes about six questions. A thorough run takes around fifteen to eighteen and
          comes out tighter. Nothing here is a bet, and nobody pays anything.
        </p>
      </>
    ),
  },
  {
    id: 'why-log-odds',
    question: 'Why do the spinner chances jump in odd steps?',
    answer: (
      <>
        <p className="mb-3">
          Moving from 1% to 2% is a big change in what you believe; moving from 50% to 51% is not.
          So the search steps evenly in <em>log-odds</em> (for example 50%, 25%, 10%, 4%, 1%)
          instead of halving percentages. The same number of questions then gives real resolution in
          the tails as well as in the middle.
        </p>
        <p>
          The width of your range and the best single guess are measured the same way. The best
          guess is the middle of the range in log-odds, which is the middle in odds, not in percent.
          A range of 1% to 10% runs from odds of about 1 to 99 to odds of about 1 to 9; the middle
          is odds of about 1 to 30, which is 3.2%, the same factor (about 3.3) from each end. The
          middle in percent, 5.5%, would sit much closer to the 10% end.
        </p>
      </>
    ),
  },
  {
    id: 'why-a-band',
    question: 'Why a range and not one number?',
    answer: (
      <>
        <p className="mb-3">
          Nearby chances feel the same, so a single number would claim more precision than anyone
          has. The range is the stretch where you could not tell which you preferred. A wide range
          is honest uncertainty, not a mistake; a narrow one means you were sure.
        </p>
        <p className="mb-3">
          Answers that do not fit together are not refused or corrected. They show up as extra
          width, and the pairs that contradict each other are listed so you can drop an answer you
          misclicked.
        </p>
        <p>
          Afterwards you can set a number of your own. It is kept next to what your answers implied,
          so the two can be compared, and it is the number &ldquo;Bet on this&rdquo; uses.
        </p>
      </>
    ),
  },
  {
    id: 'why-a-stake',
    question: 'Why am I asked to name a stake?',
    answer: (
      <p>
        Only to make you take the questions seriously: pick an amount big enough that you would
        genuinely think before answering. The amount does not feed into any calculation, because the
        prize is the same in both options and so cancels out.
      </p>
    ),
  },
] as const satisfies readonly FaqEntry[]

export type ElicitFaqId = (typeof ELICIT_FAQ_ENTRIES)[number]['id']

export function isElicitFaqId(value: string | null | undefined): value is ElicitFaqId {
  return value != null && ELICIT_FAQ_ENTRIES.some(entry => entry.id === value)
}
