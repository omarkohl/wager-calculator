// The curve drawing, in SVG units: the plot sits between TOP and BOTTOM, with room for labels
export const W = 400
export const H = 190
export const PAD = 28
export const TOP = 16
export const BOTTOM = H - 30

/** Where a pointer is in SVG units, for an SVG shown in `rect` with its aspect ratio kept (centred). */
export function toSvgPoint(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const scale = Math.min(rect.width / W, rect.height / H)
  const offsetX = (rect.width - W * scale) / 2
  const offsetY = (rect.height - H * scale) / 2
  return { x: (clientX - rect.left - offsetX) / scale, y: (clientY - rect.top - offsetY) / scale }
}
