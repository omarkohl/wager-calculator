import Decimal from 'decimal.js'
import {
  describeCount,
  describeLottery,
  lotteryForm,
  shownChance,
} from '../../domain/elicitation/lottery'

interface ReferenceLotteryProps {
  /** The chance the lottery wins, as a probability. */
  probability: Decimal.Value
}

const SIZE = 160
const R = 76
const C = SIZE / 2

/** A pie sector from 12 o'clock, clockwise, covering `fraction` of the circle. */
function sectorPath(fraction: number): string {
  const angle = fraction * 2 * Math.PI
  const x = C + R * Math.sin(angle)
  const y = C - R * Math.cos(angle)
  return `M ${C} ${C} L ${C} ${C - R} A ${R} ${R} 0 ${fraction > 0.5 ? 1 : 0} 1 ${x.toFixed(3)} ${y.toFixed(3)} Z`
}

/**
 * The reference lottery: a spinner whose shaded wedge wins with the given chance
 * (10% to 90%), or a field of balls of which some win (the tails). It always shows
 * the number, and its accessible name carries the probability. One component, so a
 * different design can replace it. [NEEDS PROTOTYPE]
 */
export default function ReferenceLottery({ probability }: ReferenceLotteryProps) {
  const form = lotteryForm(probability)
  const chance = shownChance(probability)

  return (
    <div
      role="img"
      aria-label={describeLottery(probability)}
      className="inline-flex flex-col items-center gap-2"
    >
      {form.kind === 'wedge' ? (
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <circle cx={C} cy={C} r={R} className="fill-gray-200 stroke-gray-500" strokeWidth={2} />
          <path
            d={sectorPath(form.probability.toNumber())}
            className="fill-blue-600 stroke-blue-900"
            strokeWidth={2}
          />
        </svg>
      ) : (
        <Balls winning={form.winning} total={form.total} />
      )}
      <div aria-hidden="true" className="text-center">
        <div className="text-3xl font-bold text-gray-900">{chance}</div>
        {form.kind === 'count' && (
          <div className="text-sm text-gray-700">{describeCount(form)}</div>
        )}
      </div>
    </div>
  )
}

/** `total` balls in a grid, the first `winning` filled. */
function Balls({ winning, total }: { winning: number; total: number }) {
  const columns = total === 100 ? 10 : 50
  const rows = total / columns
  const step = total === 100 ? 16 : 8
  const radius = total === 100 ? 6 : 3
  const width = columns * step
  const height = rows * step
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="h-auto max-w-full"
    >
      {Array.from({ length: total }, (_, i) => (
        <circle
          key={i}
          cx={(i % columns) * step + step / 2}
          cy={Math.floor(i / columns) * step + step / 2}
          r={radius}
          className={
            i < winning ? 'fill-blue-600 stroke-blue-900' : 'fill-gray-200 stroke-gray-500'
          }
          strokeWidth={total === 100 ? 1 : 0.75}
        />
      ))}
    </svg>
  )
}
