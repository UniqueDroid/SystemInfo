import * as hmUI from '@zos/ui'
import { px } from '@zos/utils'
import { getText } from '@zos/i18n'

import { W, COLOR, text } from '../../lib/theme'
import { caps, readDevice } from '../../lib/metrics'

const M = px(30)

Page({
  build() {
    const d = readDevice()

    text({
      x: M,
      y: px(30),
      w: W - M * 2,
      h: px(40),
      text: getText('device'),
      text_size: px(32),
    })

    const rows = [
      [getText('model'), d.deviceName || d.deviceSource || '—'],
      [getText('screen'), d.width && d.height ? d.width + ' × ' + d.height : '—'],
      [getText('shape'), shapeLabel(d.screenShape)],
      [getText('apiLevel'), d.minAPI || (caps.systemInfo ? '—' : '< 2.1')],
      [getText('osVersion'), d.osVersion || d.systemVersion || '—'],
      ['getDiskInfo', flag(caps.disk)],
      ['getPerformance', flag(caps.memory)],
      ['getSystemInfo', flag(caps.systemInfo)],
    ]

    let y = px(86)
    for (const [k, v] of rows) {
      text({
        x: M,
        y,
        w: px(220),
        h: px(38),
        text: k,
        text_size: px(22),
        color: COLOR.textDim,
      })
      text({
        x: W - M - px(240),
        y,
        w: px(240),
        h: px(38),
        text: String(v),
        text_size: px(22),
        align_h: hmUI.align.RIGHT,
      })
      y += px(42)
    }
  },
})

function flag(v) {
  return v ? '✓' : '✕'
}

function shapeLabel(shape) {
  if (shape === undefined || shape === null) return '—'
  // 0 = square, 1 = round, 2 = band — je nach Firmware; darum nur als Hinweis.
  return ['square', 'round', 'band'][shape] || String(shape)
}
