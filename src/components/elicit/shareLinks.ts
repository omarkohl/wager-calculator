import { pathFor } from '../../routes'
import { encodeInviteHash, encodeResultHash, type RunData } from '../../storage/elicitation'

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
