import { describe, expect, it } from 'vitest'
import { H, toSvgPoint, W } from './curveGeometry'

describe('toSvgPoint', () => {
  it("is the identity for a box with the drawing's own size", () => {
    expect(toSvgPoint({ left: 0, top: 0, width: W, height: H }, 100, 50)).toEqual({ x: 100, y: 50 })
  })
  it('scales a box of the same shape', () => {
    expect(
      toSvgPoint({ left: 10, top: 20, width: 2 * W, height: 2 * H }, 10 + 200, 20 + 100)
    ).toEqual({
      x: 100,
      y: 50,
    })
  })
  it('allows for the bars the browser leaves around the drawing in a box of another shape', () => {
    // 800 x 500: scale 2, the drawing (800 x 380) is centred with 60 px above and below
    expect(toSvgPoint({ left: 0, top: 0, width: 800, height: 500 }, 56, 60 + 100)).toEqual({
      x: 28,
      y: 50,
    })
    // 400 wide and tall: scale 1, centred vertically
    const p = toSvgPoint({ left: 0, top: 0, width: W, height: 400 }, 0, (400 - H) / 2)
    expect(p).toEqual({ x: 0, y: 0 })
  })
})
