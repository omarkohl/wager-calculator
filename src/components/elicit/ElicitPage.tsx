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
import HelpModal from '../HelpSection'
import { ELICIT_FAQ_ENTRIES, isElicitFaqId } from './faq'
import { getFaqIdFromURL, removeFaqFromURL } from '../../storage/urlHash'
import {
  clearMultiRun,
  loadMultiRun,
  saveMultiRun,
  type MultiRunData,
} from '../../storage/multiRun'
import ContinuousInput from './ContinuousInput'
import {
  clearContinuousRun,
  loadContinuousRun,
  saveContinuousRun,
  type ContinuousRunData,
} from '../../storage/continuousRun'
import OutcomeDiscovery from './OutcomeDiscovery'
import { emptyOutcomeList } from '../../domain/elicitation/model'
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

function faqFromHash(): string | null {
  const id = getFaqIdFromURL(window.location.hash)
  return isElicitFaqId(id) ? id : null
}

/** What the address bar held when the page opened: a shared invite or a shared result. */
type Shared = { type: 'invite'; claim: string; criteria: string } | { type: 'result'; run: RunData }

function readShared(): Shared | null {
  // A `faq` parameter may ride along with a share link; it is not part of the share
  const decoded = decodeElicitationHash(removeFaqFromURL(window.location.hash))
  if (!decoded) return null
  if (decoded.type === 'invite') return decoded
  // A shared result may have been stopped early: the link does not say, but the algorithm does
  const run = decoded.run
  return { type: 'result', run: nextFlowQuestion(run) ? { ...run, stopped: true } : run }
}

/** The elicitation tool: the setup gate, the questions of the run it starts, then the result. */
export default function ElicitPage() {
  const [run, setRun] = useState<RunData | null>(loadRun)
  const [multi, setMulti] = useState<MultiRunData | null>(loadMultiRun)
  const [cont, setCont] = useState<ContinuousRunData | null>(loadContinuousRun)
  const [shared, setShared] = useState<Shared | null>(readShared)
  const [focusGate, setFocusGate] = useState(false)
  // The FAQ opens from its button or from a `#faq=<id>` link
  const [faqId, setFaqId] = useState<string | null>(() => faqFromHash())
  const [faqOpen, setFaqOpen] = useState(() => faqFromHash() !== null)
  // Focus moves to a question or the result only after the user acted, not on a plain reload
  const [focusNext, setFocusNext] = useState(false)

  // A share link pasted into this tab changes only the hash: read it again
  useEffect(() => {
    const reread = () => {
      setShared(readShared())
      setFocusGate(false)
      const id = faqFromHash()
      if (id) {
        setFaqId(id)
        setFaqOpen(true)
      }
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

  const start = ({ claim, kind, mode }: SetupResult) => {
    // From an invite the criteria come along; the invite has done its job, so the address
    // bar goes back to the plain page
    const criteria = shared?.type === 'invite' ? shared.criteria : ''
    if (shared) window.history.replaceState(null, '', window.location.pathname)
    setShared(null)
    if (kind === 'continuous') {
      clearRun()
      clearMultiRun()
      setRun(null)
      setMulti(null)
      const started: ContinuousRunData = {
        kind,
        claim,
        criteria,
        seed: generateSeed(),
        unit: '',
        min: '',
        max: '',
        thresholds: [],
        phase: 'range',
        edges: [],
        percents: {},
        view: 'bars',
        curve: [],
        answers: [],
        stopped: false,
        adjusted: {},
      }
      saveContinuousRun(started)
      setCont(started)
      setFocusNext(true)
      return
    }
    if (kind === 'categorical') {
      clearRun()
      clearContinuousRun()
      setRun(null)
      setCont(null)
      const started: MultiRunData = {
        kind,
        claim,
        criteria,
        seed: generateSeed(),
        outcomes: emptyOutcomeList(),
        declinedElse: false,
        phase: 'discover',
        view: 'tiers',
        percents: {},
        checks: [],
        kept: false,
        reviewing: false,
        replaced: null,
        answers: [],
        stopped: false,
        adjusted: {},
        merged: [],
      }
      saveMultiRun(started)
      setMulti(started)
      setFocusNext(true)
      return
    }
    clearMultiRun()
    clearContinuousRun()
    setMulti(null)
    setCont(null)
    const base = { claim, criteria, seed: generateSeed(), dropped: [], adjusted: null }
    update(mode === 'quick' ? { ...base, mode, answers: [] } : { ...base, mode, answers: [] })
  }

  const startAgain = () => {
    clearRun()
    clearMultiRun()
    clearContinuousRun()
    setRun(null)
    setMulti(null)
    setCont(null)
    setFocusNext(false)
  }

  const changeCont = (next: ContinuousRunData) => {
    saveContinuousRun(next)
    setCont(next)
  }

  const changeMulti = (next: MultiRunData) => {
    saveMultiRun(next)
    setMulti(next)
  }

  const question = run && nextFlowQuestion(run)
  // Questions are on screen only when no share link has taken over the page
  const asking =
    shared === null && multi === null && cont === null && run !== null && question !== null

  const elicitOwn = (from: { claim: string; criteria: string }) => {
    const invite = { type: 'invite' as const, claim: from.claim, criteria: from.criteria }
    window.history.replaceState(null, '', encodeInviteHash(invite))
    setShared(invite)
    setFocusGate(true)
    setFocusNext(false)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-['Space_Grotesk'] text-3xl font-bold text-gray-900">
          How sure are you?
        </h1>
        {/* Not during the questions: explaining the method mid-run would colour the answers */}
        {!asking && (
          <button
            type="button"
            onClick={() => {
              setFaqId(null)
              setFaqOpen(true)
            }}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
          >
            How does this work?
          </button>
        )}
      </div>
      {shared?.type === 'result' ? (
        <ResultScreen
          run={shared.run}
          focusOnShow={false}
          onElicitOwn={() => elicitOwn(shared.run)}
        />
      ) : shared?.type === 'invite' || (run === null && multi === null && cont === null) ? (
        <div className="max-w-2xl">
          <p className="mt-2 mb-6 text-gray-700">
            Put a number on how likely you think something is, by comparing it with a spinner.
          </p>
          <SetupGate
            onStart={start}
            invite={shared?.type === 'invite' ? shared : undefined}
            replacesRun={run !== null || multi !== null || cont !== null}
            focusClaim={focusGate}
          />
        </div>
      ) : cont ? (
        <ContinuousInput
          run={cont}
          focusOnShow={focusNext}
          stake={stakeText()}
          onChange={changeCont}
          onStartAgain={startAgain}
        />
      ) : multi ? (
        <OutcomeDiscovery
          run={multi}
          focusOnShow={focusNext}
          stake={stakeText()}
          onChange={changeMulti}
          onStartAgain={startAgain}
        />
      ) : run === null ? null : question ? (
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
      <HelpModal
        isOpen={faqOpen}
        entries={ELICIT_FAQ_ENTRIES}
        openFaqId={faqId}
        onClose={() => {
          setFaqOpen(false)
          if (faqId) {
            setFaqId(null)
            const cleaned = removeFaqFromURL(window.location.hash)
            window.history.replaceState(null, '', cleaned || window.location.pathname)
          }
        }}
      />
    </div>
  )
}
