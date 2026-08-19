import * as hmUI from '@zos/ui'
import { px } from '@zos/utils'
import { getDeviceInfo } from '@zos/device'

export const { width: W, height: H } = getDeviceInfo()

export const COLOR = {
  bg: 0x000000,
  card: 0x14141a,
  text: 0xffffff,
  textDim: 0x8e8e98,
  track: 0x2a2a32,

  app: 0x4a9eff,
  watchface: 0xa06eff,
  music: 0x38c98d,
  system: 0xff9f0a,
  other: 0x6e6e78,

  warn: 0xff9f0a,
  danger: 0xff453a,
  estimate: 0xffd60a,
}

export const SEGMENT_COLORS = {
  app: COLOR.app,
  watchface: COLOR.watchface,
  music: COLOR.music,
  system: COLOR.system,
  other: COLOR.other,
}

/** Farbe der Kennzahl nach Fuellgrad. */
export function loadColor(ratio) {
  if (ratio >= 0.95) return COLOR.danger
  if (ratio >= 0.85) return COLOR.warn
  return COLOR.text
}

export function text(opts) {
  return hmUI.createWidget(hmUI.widget.TEXT, {
    color: COLOR.text,
    text_size: px(28),
    align_h: hmUI.align.LEFT,
    align_v: hmUI.align.CENTER_V,
    text_style: hmUI.text_style.NONE,
    text: '',
    ...opts,
  })
}

export function rect(opts) {
  return hmUI.createWidget(hmUI.widget.FILL_RECT, {
    radius: px(4),
    ...opts,
  })
}

/**
 * Einfacher Fortschrittsbalken. Gibt ein Handle mit update(ratio) zurueck,
 * damit im Poll-Intervall keine Widgets neu erzeugt werden muessen.
 */
export function bar({ x, y, w, h, color = COLOR.app, ratio = 0 }) {
  rect({ x, y, w, h, radius: h / 2, color: COLOR.track })
  const fill = rect({
    x,
    y,
    w: Math.max(h, w * clamp(ratio)),
    h,
    radius: h / 2,
    color,
  })
  return {
    update(next, nextColor) {
      fill.setProperty(hmUI.prop.MORE, {
        x,
        y,
        w: Math.max(h, w * clamp(next)),
        h,
        radius: h / 2,
        color: nextColor || color,
      })
    },
  }
}

/**
 * Gestapelter Balken aus Segmenten [{ key, bytes }]. Der Rest bis total
 * bleibt als freier Track sichtbar.
 */
export function stackedBar({ x, y, w, h, segments, total }) {
  rect({ x, y, w, h, radius: h / 2, color: COLOR.track })
  if (!total) return

  let cursor = x
  for (const seg of segments) {
    const sw = Math.round((seg.bytes / total) * w)
    if (sw < 1) continue
    rect({
      x: cursor,
      y,
      w: sw,
      h,
      radius: 0,
      color: SEGMENT_COLORS[seg.key] || COLOR.other,
    })
    cursor += sw
  }
}

function clamp(v) {
  if (!v || v < 0) return 0
  return v > 1 ? 1 : v
}
