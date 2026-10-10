import Decimal from 'decimal.js'
import { useId, useRef } from 'react'
import { formatEdge, placesFor } from '../../domain/elicitation/bucketing'
import { formatPercent } from '../../domain/elicitation/logOdds'
import { BOTTOM, H, PAD, TOP, toSvgPoint, W } from './curveGeometry'
import { CURVE_POINTS, curveBucketsOf, type ContinuousRunData } from '../../storage/continuousRun'

interface CurveInputProps {
  run: ContinuousRunData
  onChange: (run: ContinuousRunData) => void
}

const FIELD =
  'block w-24 rounded-md border border-gray-300 px-2 py-1 text-base text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none'

/**
 * A curve through evenly spaced points [NEEDS PROTOTYPE: SVG with drag, and a number per
 * point as the keyboard alternative]. The height is a relative likelihood: it has no unit and
 * only the shape counts, since it is a density (the chance per unit), not a probability. Under
 * the drawing, the chance per range follows live; the ranges come from the curve's shape and
 * the user's thresholds (`bucketCurve`). The drawing is for the pointer only: every point is
 * also a labelled field, so the curve can be set without it.
 */
export default function CurveInput({ run, onChange }: CurveInputProps) {
  const base = useId()
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef<number | null>(null)

  const min = new Decimal(run.min)
  const max = new Decimal(run.max)
  const range = max.minus(min)
  const places = Math.min(6, placesFor(range) + 1)
  const unit = run.unit ? ` ${run.unit}` : ''
  const { result, problem, heights: parsed, xs } = curveBucketsOf(run)
  const buckets = result?.buckets ?? null
  const edges = result?.edges ?? []
  const heights = Array.from({ length: CURVE_POINTS }, (_, i) => run.curve[i] ?? '')

  const setHeight = (index: number, value: string) => {
    const curve = heights.slice()
    curve[index] = value
    onChange({ ...run, curve })
  }

  const px = (i: number) => PAD + (i * (W - 2 * PAD)) / (CURVE_POINTS - 1)
  const py = (v: number) => BOTTOM - (v / 100) * (BOTTOM - TOP)
  const edgeX = (e: Decimal) =>
    PAD +
    e
      .minus(min)
      .div(range)
      .times(W - 2 * PAD)
      .toNumber()

  const pointerAt = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return { index: 0, value: 0 }
    const { x, y } = toSvgPoint(rect, clientX, clientY)
    const index = Math.round(((x - PAD) / (W - 2 * PAD)) * (CURVE_POINTS - 1))
    return {
      index: Math.max(0, Math.min(CURVE_POINTS - 1, index)),
      value: Math.max(0, Math.min(100, Math.round(((BOTTOM - y) / (BOTTOM - TOP)) * 100))),
    }
  }

  const line = parsed.map((p, i) => `${px(i)},${py(Number(p ?? 0))}`).join(' ')

  return (
    <div className="space-y-4">
      <figure className="space-y-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          aria-hidden="true"
          // The height comes from the aspect ratio, not from `height: auto` on an SVG, which
          // engines size differently
          style={{ aspectRatio: `${W} / ${H}` }}
          className="block w-full touch-none rounded-md bg-gray-50"
          onPointerDown={e => {
            try {
              e.currentTarget.setPointerCapture?.(e.pointerId)
            } catch {
              // not every engine allows capture here; dragging still works while over the drawing
            }
            const { index, value } = pointerAt(e.clientX, e.clientY)
            dragging.current = index
            setHeight(index, String(value))
          }}
          onPointerMove={e => {
            if (dragging.current !== null) {
              setHeight(dragging.current, String(pointerAt(e.clientX, e.clientY).value))
            }
          }}
          onPointerUp={() => (dragging.current = null)}
          onPointerCancel={() => (dragging.current = null)}
        >
          <text x="2" y={TOP - 4} className="fill-gray-500" fontSize="9">
            relative likelihood
          </text>
          <line
            x1={PAD}
            x2={W - PAD}
            y1={BOTTOM}
            y2={BOTTOM}
            stroke="currentColor"
            className="text-gray-300"
          />
          {[0, (CURVE_POINTS - 1) / 2, CURVE_POINTS - 1].map(i => (
            <text
              key={i}
              x={px(i)}
              y={H - 4}
              textAnchor={i === 0 ? 'start' : i === CURVE_POINTS - 1 ? 'end' : 'middle'}
              className="fill-gray-600"
              fontSize="10"
            >
              {formatEdge(xs[i], places)}
              {unit}
            </text>
          ))}
          {edges.map(e => (
            <g key={e.toString()}>
              <line
                x1={edgeX(e)}
                x2={edgeX(e)}
                y1={TOP}
                y2={BOTTOM}
                stroke="currentColor"
                strokeDasharray="3 3"
                className="text-gray-400"
              />
              <text
                x={edgeX(e)}
                y={BOTTOM + 12}
                textAnchor="middle"
                className="fill-gray-500"
                fontSize="8"
              >
                {formatEdge(e, places)}
              </text>
            </g>
          ))}
          <polyline
            points={line}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-blue-600"
          />
          {parsed.map((p, i) => (
            <circle key={i} cx={px(i)} cy={py(Number(p ?? 0))} r="5" className="fill-blue-600" />
          ))}
        </svg>
        <figcaption className="text-sm text-gray-600">
          Drag a point up or down, or type a height for each point below. The height is a relative
          likelihood, on a scale of 0 to 100 that has no unit: only the shape counts, so it is not a
          percentage. Dashed lines mark where the ranges break.
        </figcaption>
      </figure>

      <ul aria-label="Curve points" className="flex flex-wrap gap-3">
        {xs.map((x, i) => {
          const bad = parsed[i] === null
          return (
            <li key={i}>
              <label
                htmlFor={`${base}-${i}`}
                className="mb-1 block text-xs font-medium text-gray-700"
              >
                Relative likelihood at {formatEdge(x, places)}
                {unit}
              </label>
              <input
                id={`${base}-${i}`}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={heights[i]}
                onChange={e => setHeight(i, e.target.value)}
                aria-invalid={bad ? true : undefined}
                aria-describedby={bad ? `${base}-help` : undefined}
                className={FIELD}
              />
            </li>
          )
        })}
      </ul>
      <p id={`${base}-help`} className="text-sm text-gray-600">
        A height is a plain number from 0 to 100, not a percentage; blank counts as 0.
      </p>

      <div>
        {buckets ? (
          <ul aria-label="Chance per range" className="space-y-1">
            {buckets.map(b => (
              <li key={b.label} className="flex justify-between rounded-md bg-gray-50 px-3 py-1">
                <span className="text-gray-900">{b.label}</span>
                <span className="text-gray-800">{formatPercent(b.probability)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-700">{problem}</p>
        )}
      </div>
    </div>
  )
}
