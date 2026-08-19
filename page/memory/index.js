import * as hmUI from '@zos/ui'
import { px } from '@zos/utils'
import { getText } from '@zos/i18n'

import { W, COLOR, text, bar, loadColor } from '../../lib/theme'
import { bytes, pair, percent } from '../../lib/format'
import { caps, readMemory, measureResponsiveness } from '../../lib/metrics'

const M = px(30)
const INTERVAL = 2000

Page({
  state: { timer: null, bar: null, value: null, probe: null },

  build() {
    text({
      x: M,
      y: px(30),
      w: W - M * 2,
      h: px(40),
      text: getText('memory'),
      text_size: px(32),
    })

    if (!caps.memory) {
      text({
        x: M,
        y: px(84),
        w: W - M * 2,
        h: px(120),
        text: getText('memoryNeedsApi4'),
        text_size: px(22),
        color: COLOR.textDim,
        text_style: hmUI.text_style.WRAP,
      })
      this.buildProbe(px(220))
      return
    }

    this.state.value = text({
      x: M,
      y: px(74),
      w: W - M * 2,
      h: px(34),
      text: '…',
      text_size: px(26),
      color: COLOR.textDim,
    })

    this.state.bar = bar({
      x: M,
      y: px(118),
      w: W - M * 2,
      h: px(12),
      color: COLOR.system,
    })

    const m = readMemory()
    let y = px(152)
    if (m) {
      y = this.buildAppList(m, y)
    }

    this.buildProbe(y + px(10))

    this.refresh()
    this.state.timer = setInterval(() => this.refresh(), INTERVAL)
  },

  buildAppList(m, startY) {
    let y = startY
    const leaks = new Set(m.leaking.map((l) => l.appid))

    // Groesste Verbraucher zuerst, maximal fuenf — mehr passt nicht aufs
    // Display und die Long-Tail-Eintraege sagen ohnehin wenig aus.
    const apps = [...m.apps].sort((a, b) => b.used - a.used).slice(0, 5)

    for (const a of apps) {
      const leaking = leaks.has(a.appid)
      text({
        x: M,
        y,
        w: px(200),
        h: px(34),
        text: String(a.appid),
        text_size: px(22),
        color: leaking ? COLOR.danger : COLOR.textDim,
      })
      text({
        x: W - M - px(240),
        y,
        w: px(240),
        h: px(34),
        text: bytes(a.used) + '  ▲' + bytes(a.peak),
        text_size: px(22),
        align_h: hmUI.align.RIGHT,
        color: leaking ? COLOR.danger : COLOR.text,
      })
      y += px(38)
    }
    return y
  },

  // Bewusst manuell: die Busy-Loop kostet spuerbar Akku, im Intervall waere
  // sie destruktiv.
  buildProbe(y) {
    this.state.probe = text({
      x: M,
      y,
      w: W - M * 2,
      h: px(34),
      text: getText('probeHint'),
      text_size: px(22),
      color: COLOR.estimate,
      text_style: hmUI.text_style.WRAP,
    })

    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: M,
      y: y + px(44),
      w: W - M * 2,
      h: px(58),
      radius: px(29),
      normal_color: COLOR.card,
      press_color: 0x22222a,
      color: COLOR.estimate,
      text_size: px(24),
      text: getText('runProbe'),
      click_func: () => {
        const r = measureResponsiveness()
        this.state.probe.setProperty(hmUI.prop.MORE, {
          text: getText('responsiveness') + ' ~' + percent(r.score),
        })
      },
    })
  },

  refresh() {
    const m = readMemory()
    if (!m || !this.state.value) return

    this.state.value.setProperty(hmUI.prop.MORE, {
      text: pair(m.used, m.total) + '  ·  ' + percent(m.ratio),
      color: loadColor(m.ratio),
    })
    this.state.bar.update(m.ratio, loadColor(m.ratio))
  },

  onDestroy() {
    if (this.state.timer) clearInterval(this.state.timer)
  },
})
