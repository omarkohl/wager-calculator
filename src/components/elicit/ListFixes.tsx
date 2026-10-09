import { useEffect, useId, useState, type FormEvent } from 'react'
import {
  LabelError,
  mergedPercent,
  mergeOutcomes,
  renameOutcomes,
} from '../../domain/elicitation/fixes'
import { parsePercent } from '../../domain/elicitation/format'
import type { SpotCheckProblem } from '../../domain/elicitation/comparisons'
import {
  addOutcome,
  EVERYTHING_ELSE_LABEL,
  isAtCap,
  isEverythingElse,
  removeOutcome,
  type OutcomeList,
} from '../../domain/elicitation/model'
import { MAX_TEXT_LENGTH } from '../../storage/elicitation'
import type { MultiRunData } from '../../storage/multiRun'

interface ListFixesProps {
  run: MultiRunData
  problem: SpotCheckProblem
  /** The fixed run: back to the list, checks reset, with the reminder to read it all again. */
  onChange: (run: MultiRunData) => void
}

const FIELD =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none'
const PRIMARY =
  'rounded-md bg-blue-600 px-4 py-2 text-base font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
const SECONDARY =
  'rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'

type Form = 'rename' | 'merge' | 'else' | null

/** Help to fix one problem in place: rename, merge, replace with narrower outcomes, or add. */
export default function ListFixes({ run, problem, onChange }: ListFixesProps) {
  const [form, setForm] = useState<Form>(null)
  const [error, setError] = useState<string | null>(null)
  const items = run.outcomes.items
  const label = (id: string) => items.find(o => o.id === id)?.label ?? id
  const ids = { error: useId() }
  // A form that closes without a result hands the cursor back to the button that opened it
  const [openerId, setOpenerId] = useState<string | null>(null)
  useEffect(() => {
    if (form === null && openerId) document.getElementById(openerId)?.focus()
  }, [form, openerId])

  const numbers = run.view === 'numbers'
  const done = (
    outcomes: OutcomeList,
    percents: Record<string, string> = run.percents,
    replaced: string | null = null
  ) =>
    onChange({
      ...run,
      outcomes,
      percents,
      phase: 'discover',
      checks: [],
      kept: false,
      reviewing: true,
      replaced,
    })

  const without = (percents: Record<string, string>, ...gone: string[]) =>
    Object.fromEntries(Object.entries(percents).filter(([id]) => !gone.includes(id)))

  const open = (which: Exclude<Form, null>, button: HTMLButtonElement) => {
    setOpenerId(button.id)
    setError(null)
    setForm(which)
  }
  const cancel = () => {
    setError(null)
    setForm(null)
  }
  const fail = (e: unknown) =>
    setError(
      e instanceof LabelError && e.kind === 'duplicate'
        ? 'Another outcome already has that name.'
        : e instanceof LabelError && e.kind === 'empty'
          ? 'Give it a name first.'
          : `Shorten the outcome to ${MAX_TEXT_LENGTH} characters or fewer.`
    )

  // ----------------------------------------------------------------- overlap
  if (problem.type === 'overlap') {
    const { first, second } = problem
    return (
      <OverlapFixes
        run={run}
        first={first}
        second={second}
        form={form}
        error={error}
        errorId={ids.error}
        open={open}
        cancel={cancel}
        fail={fail}
        done={done}
        without={without}
        label={label}
      />
    )
  }

  // -------------------------------------------------------------- incomplete
  const hasElse = items.some(o => isEverythingElse(o.label))
  const full = isAtCap(items)
  const addElse = (percent?: string) => {
    const outcomes = addOutcome(run.outcomes, EVERYTHING_ELSE_LABEL, numbers ? null : 'unlikely')
    const added = outcomes.items[outcomes.items.length - 1]
    done(outcomes, numbers ? { ...run.percents, [added.id]: percent ?? '' } : run.percents)
  }
  const submitElse = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const percent = parsePercent(String(new FormData(event.currentTarget).get('percent') ?? ''))
    if (percent === null) {
      setError('Enter a percentage above 0 and below 100, with at most two decimals.')
      return
    }
    addElse(percent)
  }
  return (
    <div className="mt-2 space-y-3">
      <div className="flex flex-wrap gap-3">
        {!hasElse && !full && (
          <button
            type="button"
            className={SECONDARY}
            id={`${ids.error}-else`}
            onClick={e => (numbers ? open('else', e.currentTarget) : addElse())}
          >
            Add “{EVERYTHING_ELSE_LABEL}”
          </button>
        )}
        <button
          type="button"
          className={SECONDARY}
          disabled={full}
          onClick={() => done(run.outcomes)}
        >
          Add another outcome
        </button>
      </div>
      {full && (
        <p className="text-sm text-gray-700">
          The list is full. Use “Change the outcomes” to merge or remove some, then check it again.
        </p>
      )}
      {form === 'else' && (
        <form onSubmit={submitElse} noValidate className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Percent for “{EVERYTHING_ELSE_LABEL}”
            <input
              name="percent"
              autoFocus
              type="text"
              inputMode="decimal"
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? ids.error : undefined}
              onChange={() => setError(null)}
              className={`${FIELD} mt-1 w-32`}
            />
          </label>
          {error && (
            <p id={ids.error} role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button type="submit" className={PRIMARY}>
              Add it
            </button>
            <button type="button" className={SECONDARY} onClick={cancel}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

interface OverlapProps {
  run: MultiRunData
  first: string
  second: string
  form: Form
  error: string | null
  errorId: string
  open: (which: Exclude<Form, null>, button: HTMLButtonElement) => void
  cancel: () => void
  fail: (e: unknown) => void
  done: (outcomes: OutcomeList, percents?: Record<string, string>, replaced?: string | null) => void
  without: (percents: Record<string, string>, ...gone: string[]) => Record<string, string>
  label: (id: string) => string
}

function OverlapFixes(p: OverlapProps) {
  const { run, first, second, form, error, errorId } = p
  const a = p.label(first)
  const b = p.label(second)
  const [nameA, setNameA] = useState(a)
  const [nameB, setNameB] = useState(b)
  const [merged, setMerged] = useState(`${a} or ${b}`)
  const fieldA = useId()
  const fieldB = useId()
  const fieldM = useId()

  /** Throws a message-less error that `fail` words as a length problem. */
  const tooLong = (names: string[]) => {
    if (names.some(n => n.trim().length > MAX_TEXT_LENGTH)) throw new Error('too long')
  }
  const rename = (event: FormEvent) => {
    event.preventDefault()
    try {
      tooLong([nameA, nameB])
      p.done(
        renameOutcomes(run.outcomes, [
          { id: first, label: nameA },
          { id: second, label: nameB },
        ])
      )
    } catch (e) {
      p.fail(e)
    }
  }
  const merge = (event: FormEvent) => {
    event.preventDefault()
    try {
      tooLong([merged])
      const result = mergeOutcomes(run.outcomes, first, second, merged)
      p.done(
        result.list,
        run.view === 'numbers'
          ? {
              ...p.without(run.percents, first, second),
              [result.id]: mergedPercent(run.percents[first], run.percents[second]),
            }
          : run.percents
      )
    } catch (e) {
      p.fail(e)
    }
  }
  const replace = (id: string) =>
    p.done(removeOutcome(run.outcomes, id), p.without(run.percents, id), p.label(id))

  return (
    <div className="mt-2 space-y-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={SECONDARY}
          id={`${errorId}-rename`}
          onClick={e => p.open('rename', e.currentTarget)}
        >
          Rename “{a}” and “{b}”
        </button>
        <button
          type="button"
          className={SECONDARY}
          id={`${errorId}-merge`}
          onClick={e => p.open('merge', e.currentTarget)}
        >
          Merge “{a}” and “{b}”
        </button>
        <button type="button" className={SECONDARY} onClick={() => replace(first)}>
          Replace “{a}” with narrower outcomes
        </button>
        <button type="button" className={SECONDARY} onClick={() => replace(second)}>
          Replace “{b}” with narrower outcomes
        </button>
      </div>
      {form === 'rename' && (
        <form onSubmit={rename} noValidate className="space-y-3">
          <div>
            <label htmlFor={fieldA} className="mb-1 block text-sm font-medium text-gray-700">
              New name for “{a}”
            </label>
            <input
              id={fieldA}
              autoFocus
              value={nameA}
              maxLength={MAX_TEXT_LENGTH}
              onChange={e => setNameA(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor={fieldB} className="mb-1 block text-sm font-medium text-gray-700">
              New name for “{b}”
            </label>
            <input
              id={fieldB}
              value={nameB}
              maxLength={MAX_TEXT_LENGTH}
              onChange={e => setNameB(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={FIELD}
            />
          </div>
          <FormEnd error={error} errorId={errorId} submit="Save names" cancel={p.cancel} />
        </form>
      )}
      {form === 'merge' && (
        <form onSubmit={merge} noValidate className="space-y-3">
          <div>
            <label htmlFor={fieldM} className="mb-1 block text-sm font-medium text-gray-700">
              Name of the merged outcome
            </label>
            <input
              id={fieldM}
              autoFocus
              value={merged}
              maxLength={MAX_TEXT_LENGTH}
              onChange={e => setMerged(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={FIELD}
            />
          </div>
          <FormEnd error={error} errorId={errorId} submit="Merge them" cancel={p.cancel} />
        </form>
      )}
    </div>
  )
}

function FormEnd(props: {
  error: string | null
  errorId: string
  submit: string
  cancel: () => void
}) {
  return (
    <>
      {props.error && (
        <p id={props.errorId} role="alert" className="text-sm text-red-700">
          {props.error}
        </p>
      )}
      <div className="flex gap-3">
        <button type="submit" className={PRIMARY}>
          {props.submit}
        </button>
        <button type="button" className={SECONDARY} onClick={props.cancel}>
          Cancel
        </button>
      </div>
    </>
  )
}
