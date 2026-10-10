import { parseNumber } from '../../domain/elicitation/format'
import { pathFor } from '../../routes'
import { encodeInviteHash, encodeResultHash, type RunData } from '../../storage/elicitation'
import type { ContinuousRunData } from '../../storage/continuousRun'
import type { MultiRunData } from '../../storage/multiRun'
import { encodeContinuousResultHash, encodeMultiResultHash } from '../../storage/multiShare'

/** The absolute address of the elicitation page with a share hash. */
function elicitUrl(hash: string): string {
  return `${window.location.origin}${pathFor('elicit', import.meta.env.BASE_URL)}${hash}`
}

/** A link to elicit one's own belief about the same claim: claim and criteria, nothing else. */
export function inviteLink(run: Pick<RunData, 'claim' | 'criteria'>): string {
  return elicitUrl(encodeInviteHash({ claim: run.claim, criteria: run.criteria }))
}

/** A link to this result: claim, criteria, mode, seed, answers, dropped answers, adjusted value. */
export function resultLink(run: RunData): string {
  return elicitUrl(encodeResultHash(run))
}

/** A link to answer about the same outcomes: the claim, the criteria and the outcomes, nothing else. */
export function multiInviteLink(
  run: Pick<MultiRunData, 'claim' | 'criteria' | 'outcomes'>
): string {
  return elicitUrl(
    encodeInviteHash({
      claim: run.claim,
      criteria: run.criteria,
      shape: { kind: 'categorical', outcomes: run.outcomes.items.map(o => o.label) },
    })
  )
}

/** A link to answer about the same ranges: the claim, the criteria, the range and its edges. */
export function continuousInviteLink(
  run: Pick<
    ContinuousRunData,
    'claim' | 'criteria' | 'unit' | 'min' | 'max' | 'thresholds' | 'edges'
  >
): string {
  return elicitUrl(
    encodeInviteHash({
      claim: run.claim,
      criteria: run.criteria,
      shape: {
        kind: 'continuous',
        unit: run.unit,
        // typed as "0,5" or "2.50", shared in the plain form the link is read back in
        min: parseNumber(run.min) ?? run.min,
        max: parseNumber(run.max) ?? run.max,
        thresholds: run.thresholds,
        edges: run.edges,
      },
    })
  )
}

/** A link to this result: the outcomes, the numbers it started from, the answers, the own numbers. */
export function multiResultLink(run: MultiRunData): string {
  return elicitUrl(encodeMultiResultHash(run))
}

/** A link to this result of a number claim: the range, the edges, the numbers, the answers. */
export function continuousResultLink(run: ContinuousRunData): string {
  return elicitUrl(encodeContinuousResultHash(run))
}
