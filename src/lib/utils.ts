import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Given a hex color like `#rrggbb` or `#rgb`, return either '#000000' or '#ffffff'
 * whichever provides better contrast. Falls back to black for invalid input.
 */
export function getContrastColor(hex?: string) {
  if (!hex) return '#000000'
  try {
    const h = hex.replace('#', '')
    const r = parseInt(h.length === 3 ? h[0] + h[0] : h.slice(0, 2), 16)
    const g = parseInt(h.length === 3 ? h[1] + h[1] : h.slice(h.length === 3 ? 1 : 2, h.length === 3 ? 2 : 4), 16)
    const b = parseInt(h.length === 3 ? h[2] + h[2] : h.slice(h.length === 3 ? 2 : 4, h.length === 3 ? 3 : 6), 16)

    // Perceived luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.6 ? '#000000' : '#ffffff'
  } catch (e) {
    return '#000000'
  }
}
