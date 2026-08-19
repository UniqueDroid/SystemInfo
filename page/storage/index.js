import * as hmUI from '@zos/ui'
import { px } from '@zos/utils'
import { getText } from '@zos/i18n'

import { W, COLOR, SEGMENT_COLORS, text, rect, stackedBar } from '../../lib/theme'
import { bytes, percent } from '../../lib/format'
import { readDisk } from '../../lib/metrics'

const M = px(30)

Page({
  build() {
    const d = readDisk()

    text({
      x: M,
      y: px(30),
      w: W - M * 2,
      h: px(40),
      text: getText('storage'),
      text_size: px(32),
    })

    if (!d) {
      text({
        x: M,
        y: px(90),
        w: W - M * 2,
        h: px(60),
        text: getText('unavailable'),
        text_size: px(24),
        color: COLOR.textDim,
        text_style: hmUI.text_style.WRAP,
      })
      return
    }

    text({
      x: M,
      y: px(74),
      w: W - M * 2,
      h: px(32),
      text: bytes(d.free) + ' ' + getText('free'),
      text_size: px(26),
      color: COLOR.textDim,
    })

    stackedBar({
      x: M,
      y: px(120),
      w: W - M * 2,
      h: px(18),
      segments: d.segments,
      total: d.total,
    })

    // Legende: nur Kategorien mit Inhalt, absteigend nach Groesse.
    const rows = d.segments
      .filter((s) => s.bytes > 0)
      .sort((a, b) => b.bytes - a.bytes)
      .concat([{ key: 'free', bytes: d.free }])

    let y = px(160)
    for (const row of rows) {
      this.legendRow(y, row, d.total)
      y += px(44)
    }
  },

  legendRow(y, row, total) {
    rect({
      x: M,
      y: y + px(12),
      w: px(14),
      h: px(14),
      radius: px(7),
      color: row.key === 'free' ? COLOR.track : SEGMENT_COLORS[row.key],
    })

    text({
      x: M + px(26),
      y,
      w: px(180),
      h: px(38),
      text: getText(row.key),
      text_size: px(24),
      color: COLOR.textDim,
    })

    text({
      x: W - M - px(200),
      y,
      w: px(200),
      h: px(38),
      text: bytes(row.bytes) + '  ' + percent(row.bytes / total),
      text_size: px(24),
      align_h: hmUI.align.RIGHT,
    })
  },
})
