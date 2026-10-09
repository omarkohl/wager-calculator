import { useEffect, useRef, useState } from 'react'
import { CURRENCY_OPTIONS } from '../../domain/stakes'
import { buildHandoff } from '../../domain/elicitation/handoff'
import { navigate } from '../../navigation'
import { pathFor } from '../../routes'
import { encodeWagerToHash } from '../../storage/urlHash'
import type { Choice } from '../../domain/elicitation/bandRule'
import {
  clearRun,
  decodeElicitationHash,
  encodeInviteHash,
  generateSeed,
  getSavedElicitStake,
  loadRun,
  saveRun,
  type RunData,
} from '../../storage/elicitation'
import QuestionScreen from './QuestionScreen'
import ResultScreen from './ResultScreen'
import SetupGate, { type SetupResult } from './SetupGate'
import { inviteLink, resultLink } from './shareLinks'
import { answerQuestion, nextFlowQuestion, questionsLeft, stopRun } from './runFlow'

function stakeText(): string | null {
  const stake = getSavedElicitStake()
  if (!stake) return null
  const currency = CURRENCY_OPTIONS.find(c => c.id === stake.currency)
  return `${stake.amount} ${currency?.id.toUpperCase() ?? stake.currency}`
}

/** Stopping before the first answer says nothing: no answers, no result. */
function NoResult({
  focusOnShow,
  onStartAgain,
}: {
  focusOnShow: boolean
  onStartAgain: () => void
}) {
  const ref = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (focusOnShow) ref.current?.focus()
  }, [focusOnShow])
  return (
    <div className="mt-4">
      <p ref={ref} tabIndex={-1} className="text-gray-700 focus:outline-none">
        You stopped before answering, so there is no result.
      </p>
      <button
        type="button"
        onClick={onStartAgain}
        className="mt-4 rounded-md bg-blue-600 px-5 py-2 text-base font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
      >
        Start again
      </button>
    </div>
  )
}

/** What the address bar held when the page opened: a shared invite or a shared result. */
type Shared = { type: 'invite'; claim: string; criteria: string } | { type: 'result'; run: RunData }

function readShared(): Shared | null {
  const decoded = decodeElicitationHash(window.location.hash)
  if (!decoded) return null
  if (decoded.type === 'invite') return decoded
  // A shared result may have been stopped early: the link does not say, but the algorithm does
  const run = decoded.run
  return { type: 'result', run: nextFlowQuestion(run) ? { ...run, stopped: true } : run }
}

/** The elicitation tool: the setup gate, the questions of the run it starts, then the result. */
export default function ElicitPage() {
  const [run, setRun] = useState<RunData | null>(loadRun)
  const [shared, setShared] = useState<Shared | null>(readShared)
  const [focusGate, setFocusGate] = useState(false)
  // Focus moves to a question or the result only after the user acted, not on a plain reload
  const [focusNext, setFocusNext] = useState(false)

  // A share link pasted into this tab changes only the hash: read it again
  useEffect(() => {
    const reread = () => {
      setShared(readShared())
      setFocusGate(false)
    }
    window.addEventListener('hashchange', reread)
    window.addEventListener('popstate', reread)
    return () => {
      window.removeEventListener('hashchange', reread)
      window.removeEventListener('popstate', reread)
    }
  }, [])

  const update = (next: RunData) => {
    saveRun(next)
    setRun(next)
    setFocusNext(true)
  }

  const start = ({ claim, mode }: SetupResult) => {
    // From an invite the criteria come along; the invite has done its job, so the address
    // bar goes back to the plain page
    const criteria = shared?.type === 'invite' ? shared.criteria : ''
    if (shared) window.history.replaceState(null, '', window.location.pathname)
    setShared(null)
    const base = { claim, criteria, seed: generateSeed(), dropped: [], adjusted: null }
    update(mode === 'quick' ? { ...base, mode, answers: [] } : { ...base, mode, answers: [] })
  }

  const startAgain = () => {
    clearRun()
    setRun(null)
    setFocusNext(false)
  }

  const question = run && nextFlowQuestion(run)

  const elicitOwn = (from: { claim: string; criteria: string }) => {
    const invite = { type: 'invite' as const, claim: from.claim, criteria: from.criteria }
    window.history.replaceState(null, '', encodeInviteHash(invite))
    setShared(invite)
    setFocusGate(true)
    setFocusNext(false)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-['Space_Grotesk'] text-3xl font-bold text-gray-900">How sure are you?</h1>
      {shared?.type === 'result' ? (
        <ResultScreen
          run={shared.run}
          focusOnShow={false}
          onElicitOwn={() => elicitOwn(shared.run)}
        />
      ) : shared?.type === 'invite' || run === null ? (
        <div className="max-w-2xl">
          <p className="mt-2 mb-6 text-gray-700">
            Put a number on how likely you think something is, by comparing it with a spinner.
          </p>
          <SetupGate
            onStart={start}
            invite={shared?.type === 'invite' ? shared : undefined}
            replacesRun={run !== null}
            focusClaim={focusGate}
          />
        </div>
      ) : question ? (
        <QuestionScreen
          claim={run.claim}
          stake={stakeText()}
          question={question}
          questionsLeft={questionsLeft(run)}
          focusOnShow={focusNext}
          onAnswer={(choice: Choice) => update(answerQuestion(run, question, choice))}
          onStop={() => update(stopRun(run))}
        />
      ) : run.answers.length === 0 ? (
        <NoResult focusOnShow={focusNext} onStartAgain={startAgain} />
      ) : (
        <ResultScreen
          run={run}
          focusOnShow={focusNext}
          onDrop={index =>
            update({ ...run, dropped: [...new Set([...run.dropped, index])].sort((a, b) => a - b) })
          }
          onRestore={index => update({ ...run, dropped: run.dropped.filter(i => i !== index) })}
          onCriteria={criteria => {
            // Typing is not an "arrival": keep focus where it is
            saveRun({ ...run, criteria })
            setRun({ ...run, criteria })
            setFocusNext(false)
          }}
          onAdjusted={adjusted => {
            // Typing is not an "arrival": keep focus where it is
            saveRun({ ...run, adjusted })
            setRun({ ...run, adjusted })
            setFocusNext(false)
          }}
          onRerun={() => {
            // A new run starts clean: an old adjusted belief says nothing about the new answers
            const fresh = {
              ...run,
              seed: generateSeed(),
              dropped: [],
              adjusted: null,
              stopped: undefined,
            }
            update(
              run.mode === 'quick'
                ? { ...fresh, mode: 'quick', answers: [] }
                : { ...fresh, mode: 'thorough', answers: [] }
            )
          }}
          onStartAgain={startAgain}
          share={{ invite: () => inviteLink(run), result: () => resultLink(run) }}
          onBet={({ probability, band }) => {
            const { wager, provenance } = buildHandoff({
              claim: run.claim,
              criteria: run.criteria,
              currency: getSavedElicitStake()?.currency ?? null,
              probability,
              band,
            })
            // The provenance rides in the history entry: transient, gone on the first edit or reload
            navigate(`${pathFor('wager', import.meta.env.BASE_URL)}${encodeWagerToHash(wager)}`, {
              provenance,
            })
          }}
        />
      )}
    </div>
  )
}
