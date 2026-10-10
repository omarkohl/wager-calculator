import { useRef } from 'react'
import { continuousToMultiRun, toMultiRun, withAnswers } from '../../storage/multiAnswers'
import type { SharedMulti } from '../../storage/multiShare'
import MultiResult from './MultiResult'

interface SharedMultiResultProps {
  shared: SharedMulti
  /** Rate the same outcomes oneself: an invite to them. */
  onElicitOwn: () => void
}

/** Someone else's result of a claim with several outcomes or of a number, opened from a link. */
export default function SharedMultiResult({ shared, onElicitOwn }: SharedMultiResultProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const run = shared.run
  const base =
    shared.type === 'result-multi'
      ? withAnswers(toMultiRun(shared.run), shared.run.answers)
      : withAnswers(continuousToMultiRun(shared.run), shared.run.answers)
  if (!base) return null
  return (
    <MultiResult
      claim={run.claim}
      run={base}
      stopped={run.stopped}
      kept={shared.type === 'result-multi' && shared.run.kept}
      headingRef={headingRef}
      adjusted={run.adjusted}
      onAdjusted={() => {}}
      merged={shared.type === 'result-multi' ? shared.run.merged : undefined}
      sharedBy={{
        onElicitOwn,
        kind: shared.type === 'result-multi' ? 'categorical' : 'continuous',
      }}
      onStartAgain={() => {}}
    />
  )
}
