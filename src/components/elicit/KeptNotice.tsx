/** The standing notice on numbers whose outcomes the checks found overlapping or incomplete. */
export default function KeptNotice() {
  return (
    <p role="note" className="rounded-lg bg-amber-50 p-3 text-sm text-gray-900">
      The outcomes overlap or leave something out, so these numbers do not mean anything: the
      probabilities of such outcomes cannot add up to 100%.
    </p>
  )
}
