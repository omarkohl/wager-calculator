import { useEffect, useId, useRef } from 'react'
import {
  spotCheckProblems,
  type SpotCheck,
  type SpotCheckAnswer,
} from '../../domain/elicitation/comparisons'
import { spotChecksOf, type MultiRunData } from '../../storage/multiRun'

interface SpotChecksProps {
  run: MultiRunData
  /** Put the cursor on the question on arrival (after the user acted, not on a plain load). */
  focusOnShow: boolean
  onChange: (run: MultiRunData) => void
  onStartAgain: () => void
}

const PRIMARY =
  'rounded-md bg-blue-600 px-5 py-2 text-base font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
const SECONDARY =
  'rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'

/**
 * The spot checks that the outcomes are disjoint and exhaustive: a few random pairs and one
 * completeness check, not every combination. A problem is said plainly: the tool is the wrong
 * one for overlapping or incomplete outcomes. Nothing stops the user from keeping such a
 * list, but the numbers then carry a notice that they mean nothing.
 */
export default function SpotChecks({ run, focusOnShow, onChange, onStartAgain }: SpotChecksProps) {
  const labelOf = (id: string) => run.outcomes.items.find(o => o.id === id)?.label ?? id
  const asked = spotChecksOf(run.outcomes, run.seed)
  const current: SpotCheck | undefined = asked[run.checks.length]
  const problems = spotCheckProblems(run.checks)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const acted = useRef(focusOnShow)
  const headingId = useId()
  const introId = useId()
  // The heading takes the cursor for each new question and for the verdict, once the user acted
  useEffect(() => {
    if (acted.current) headingRef.current?.focus()
  }, [run.checks.length])

  const changeOutcomes = () =>
    onChange({ ...run, phase: 'discover', checks: [], kept: false, reviewing: false })

  /** Always a way out: back to the list, or to the beginning. */
  const exits = (
    <div className="flex flex-wrap gap-3">
      <button type="button" className={SECONDARY} onClick={changeOutcomes}>
        Change the outcomes
      </button>
      <button type="button" className={SECONDARY} onClick={onStartAgain}>
        Start again
      </button>
    </div>
  )

  const answer = (a: SpotCheckAnswer) => {
    acted.current = true
    const checks = [...run.checks, a]
    // Finished and clean: on to the sketch. Finished with a problem: the verdict screen
    const clean = checks.length === asked.length && spotCheckProblems(checks).length === 0
    onChange({ ...run, checks, phase: clean ? 'sketch' : 'check', reviewing: false })
  }

  if (!current) {
    // Every check is answered and something is wrong
    return (
      <div className="mt-4 max-w-2xl space-y-4" aria-labelledby={headingId} role="group">
        <h2
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-semibold text-gray-900 focus:outline-none"
        >
          This list has a problem
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-gray-800">
          {problems.map((p, i) => (
            <li key={i}>
              {p.type === 'overlap'
                ? `“${labelOf(p.first)}” and “${labelOf(p.second)}” can both happen.`
                : 'It could turn out to be none of these.'}
            </li>
          ))}
        </ul>
        <p className="text-gray-700">
          This is the wrong tool for outcomes that overlap or leave something out: their
          probabilities cannot add up to 100%. Fix the list, and the numbers will mean something. If
          you keep it as it is, the numbers carry a notice that they mean nothing.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={PRIMARY}
            onClick={() =>
              onChange({ ...run, phase: 'discover', checks: [], kept: false, reviewing: true })
            }
          >
            Change the outcomes
          </button>
          <button
            type="button"
            className={SECONDARY}
            onClick={() => {
              acted.current = true
              onChange({ ...run, phase: 'sketch', kept: true })
            }}
          >
            Keep them as they are
          </button>
          <button type="button" className={SECONDARY} onClick={onStartAgain}>
            Start again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 max-w-2xl space-y-4" aria-labelledby={headingId} role="group">
      <p id={introId} className="text-sm text-gray-600">
        Check {run.checks.length + 1} of {asked.length}. The outcomes must not overlap, and together
        they must cover everything that could happen.
      </p>
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        aria-describedby={introId}
        className="text-xl font-semibold text-gray-900 focus:outline-none"
      >
        {current.type === 'pair'
          ? `Can “${labelOf(current.first)}” and “${labelOf(current.second)}” both happen?`
          : 'Could it turn out to be none of these?'}
      </h2>
      <div className="flex flex-wrap gap-3">
        {current.type === 'pair' ? (
          <>
            <button
              type="button"
              className={SECONDARY}
              onClick={() =>
                answer({
                  type: 'pair',
                  first: current.first,
                  second: current.second,
                  bothCanHappen: false,
                })
              }
            >
              No, only one can happen
            </button>
            <button
              type="button"
              className={SECONDARY}
              onClick={() =>
                answer({
                  type: 'pair',
                  first: current.first,
                  second: current.second,
                  bothCanHappen: true,
                })
              }
            >
              Yes, both can happen
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={SECONDARY}
              onClick={() => answer({ type: 'completeness', couldBeNone: false })}
            >
              No, one of these will happen
            </button>
            <button
              type="button"
              className={SECONDARY}
              onClick={() => answer({ type: 'completeness', couldBeNone: true })}
            >
              Yes, it could
            </button>
          </>
        )}
      </div>
      {exits}
    </div>
  )
}
