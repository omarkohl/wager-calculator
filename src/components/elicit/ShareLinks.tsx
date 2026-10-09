import { useId, useState } from 'react'

interface ShareLinksProps {
  /** Built when the button is pressed, so they always match the current result. */
  invite: () => string
  result: () => string
}

type Kind = 'invite' | 'result'

const BUTTON =
  'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'

/**
 * Two ways to share: an invite (claim and criteria, so a friend can elicit their own
 * belief about the same claim, unanchored) and the result (answers and all). Each button
 * copies the link and shows it, so it can still be copied by hand if the browser refuses.
 * The claim is part of both links; the text says so. [NEEDS PROTOTYPE]
 */
export default function ShareLinks({ invite, result }: ShareLinksProps) {
  const fieldId = useId()
  // What was pressed, and what was copied for it. The link itself is built at render, so
  // it always matches the result now on screen.
  const [shown, setShown] = useState<Kind | null>(null)
  const [copied, setCopied] = useState<{ kind: Kind; url: string; ok: boolean } | null>(null)

  const urlFor = (kind: Kind) => (kind === 'invite' ? invite() : result())
  const current = shown ? urlFor(shown) : null

  const share = async (kind: Kind) => {
    const url = urlFor(kind)
    setShown(kind)
    // Clear first, so pressing the same button again is announced again
    setCopied(null)
    let ok = true
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      ok = false
    }
    setCopied({ kind, url, ok })
  }

  const status = !copied
    ? ''
    : copied.url !== current
      ? 'The result changed since you copied this link. Copy it again.'
      : copied.ok
        ? `${copied.kind === 'invite' ? 'Invite' : 'Result'} link copied`
        : 'Could not copy automatically. Copy the link below.'

  return (
    <section
      aria-labelledby={`${fieldId}-heading`}
      className="rounded-lg border border-gray-200 p-4"
    >
      <h3 id={`${fieldId}-heading`} className="text-base font-semibold text-gray-900">
        Share
      </h3>
      <p className="mt-1 text-sm text-gray-600">
        An invite lets a friend put their own number on the same claim, without seeing yours. The
        result link also carries your answers. Both links contain the claim itself.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => share('invite')} className={BUTTON}>
          Copy invite link
        </button>
        <button type="button" onClick={() => share('result')} className={BUTTON}>
          Copy result link
        </button>
      </div>
      <div role="status" className="mt-2 text-sm text-gray-700">
        {status}
      </div>
      {shown && current && (
        <div className="mt-2">
          <label htmlFor={fieldId} className="text-sm font-medium text-gray-600">
            {shown === 'invite' ? 'Invite link' : 'Result link'}
          </label>
          <input
            id={fieldId}
            type="text"
            readOnly
            value={current}
            onFocus={e => e.currentTarget.select()}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </div>
      )}
    </section>
  )
}
