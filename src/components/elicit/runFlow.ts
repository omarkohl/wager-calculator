import type { Choice, WedgeAnswer } from '../../domain/elicitation/bandRule'
import { approxQuestionsLeft, nextQuestion } from '../../domain/elicitation/quickSearch'
import {
  approxThoroughQuestionsLeft,
  armFor,
  nextThoroughQuestion,
  type ArmOrder,
  type Frame,
  type ThoroughAnswer,
  type ThoroughQuestion,
} from '../../domain/elicitation/thorough'
import type { RunData } from '../../storage/elicitation'

/**
 * The question flow of a run, for both modes: what to ask next, how an answer is
 * recorded, how to stop. Pure; the run lives in `RunData`.
 */

/** What the question screen needs to put one comparison in front of the user. */
export interface FlowQuestion {
  wedge: ThoroughQuestion['wedge']
  /** `negation`: the comparison is about the claim being false. */
  frame: Frame
  /** Which arm is shown first. */
  armOrder: ArmOrder
  /** The tagged question this answers, to record the answer with. */
  tagged: ThoroughQuestion | null
}

/** The next question, or null if the run is done or was stopped. */
export function nextFlowQuestion(run: RunData): FlowQuestion | null {
  if (run.stopped) return null
  if (run.mode === 'thorough') {
    const q = nextThoroughQuestion(run.answers, run.seed)
    return q && { wedge: q.wedge, frame: q.frame, armOrder: q.armOrder, tagged: q }
  }
  const q = nextQuestion(run.answers, run.seed)
  return (
    q && {
      wedge: q.wedge,
      frame: 'claim',
      armOrder: armFor(run.seed, run.answers.length),
      tagged: null,
    }
  )
}

/** The run with the user's answer to `question` recorded. */
export function answerQuestion(run: RunData, question: FlowQuestion, choice: Choice): RunData {
  if (run.mode === 'quick') {
    const answer: WedgeAnswer = { wedge: question.wedge, choice }
    return { ...run, answers: [...run.answers, answer] }
  }
  const t = question.tagged!
  const answer: ThoroughAnswer = {
    wedge: t.wedge,
    choice,
    frame: t.frame,
    stair: t.stair,
    kind: t.kind,
    armOrder: t.armOrder,
  }
  return { ...run, answers: [...run.answers, answer] }
}

export function stopRun(run: RunData): RunData {
  return { ...run, stopped: true }
}

export interface QuestionsLeft {
  count: number
  /** The estimate went up with the last answer: the search had to look further out. */
  longer: boolean
}

function estimate(run: RunData, upTo: number): number {
  return run.mode === 'quick'
    ? approxQuestionsLeft(run.answers.slice(0, upTo), run.seed)
    : approxThoroughQuestionsLeft(run.answers.slice(0, upTo), run.seed)
}

/** "Approx. N questions left" (both modes), or null once the run is over. */
export function questionsLeft(run: RunData): QuestionsLeft | null {
  if (nextFlowQuestion(run) === null) return null
  const n = run.answers.length
  const count = estimate(run, n)
  return { count, longer: n > 0 && count > estimate(run, n - 1) }
}
