import * as hmUI from '@zos/ui'
import { push } from '@zos/router'
import { px } from '@zos/utils'
import { getText } from '@zos/i18n'
import { log as Logger } from '@zos/utils'

import { W, COLOR, text, rect, bar, loadColor } from '../../lib/theme'
import { bytes, pair, percent } from '../../lib/format'
import {
  caps,
  readDisk,
  readMemory,
  readBattery,
  onBatteryChange,
} from '../../lib/metrics'

const logger = Logger.getLogger('systeminfo/home')

const DISK_INTERVAL = 10000
const MEM_INTERVAL = 2000

const M = px(30) // Seitenrand
const CARD_W = W - M * 2
const CARD_H = px(104)

Page({
  state: {
    widgets: {},
    timers: [],
    offBattery: null,
  },

  build() {
    hmUI.setStatusBarVisible && hmUI.setStatusBarVisible(true)

    this.buildHeader()

    let y = px(112)
    this.state.widgets.disk = this.buildCard({
      y,
      title: getText('storage'),
      color: COLOR.app,
      route: 'page/storage/index',
    })

    y += CARD_H + px(14)
    this.state.widgets.memory = this.buildCard({
      y,
      title: getText('memory'),
      color: COLOR.system,
      route: 'page/memory/index',
      disabled: !caps.memory,
    })

    y += CARD_H + px(14)
    this.state.widgets.device = this.buildCard({
      y,
      title: getText('device'),
      color: COLOR.music,
      route: 'page/device/index',
      arrowOnly: true,
    })

    this.refreshDisk()
    this.refreshMemory()
    this.refreshBattery()

    this.state.timers.push(setInterval(() => this.refreshDisk(), DISK_INTERVAL))
    this.state.timers.push(setInterval(() => this.refreshMemory(), MEM_INTERVAL))
    this.state.offBattery = onBatteryChange(() => this.refreshBattery())
  },

  buildHeader() {
    text({
      x: M,
      y: px(36),
      w: CARD_W,
      h: px(40),
      text: getText('appName'),
      text_size: px(32),
      color: COLOR.text,
    })

    this.state.widgets.battery = text({
      x: M,
      y: px(74),
      w: CARD_W,
      h: px(30),
      text: '',
      text_size: px(24),
      color: COLOR.textDim,
    })
  },

  buildCard({ y, title, color, route, disabled = false, arrowOnly = false }) {
    rect({ x: M, y, w: CARD_W, h: CARD_H, radius: px(16), color: COLOR.card })

    text({
      x: M + px(20),
      y: y + px(12),
      w: CARD_W - px(40),
      h: px(30),
      text: title,
      text_size: px(24),
      color: COLOR.textDim,
    })

    const value = text({
      x: M + px(20),
      y: y + px(42),
      w: CARD_W - px(40),
      h: px(34),
      text: disabled ? getText('unavailable') : '…',
      text_size: px(28),
      color: disabled ? COLOR.textDim : COLOR.text,
    })

    let progress = null
    if (!arrowOnly && !disabled) {
      progress = bar({
        x: M + px(20),
        y: y + px(80),
        w: CARD_W - px(40),
        h: px(8),
        color,
      })
    }

    if (!disabled) {
      hmUI.createWidget(hmUI.widget.BUTTON, {
        x: M,
        y,
        w: CARD_W,
        h: CARD_H,
        normal_color: 0x00000000,
        press_color: 0x22222a,
        radius: px(16),
        text: '',
        click_func: () => push({ url: route }),
      })
    }

    return { value, progress }
  },

  refreshDisk() {
    const d = readDisk()
    const card = this.state.widgets.disk
    if (!d || !card) return

    card.value.setProperty(hmUI.prop.MORE, {
      text: pair(d.used, d.total) + '  ·  ' + percent(d.ratio),
      color: loadColor(d.ratio),
    })
    card.progress && card.progress.update(d.ratio, loadColor(d.ratio))
  },

  refreshMemory() {
    const m = readMemory()
    const card = this.state.widgets.memory
    if (!card) return
    if (!m) {
      // Karte bleibt sichtbar und erklaert sich — kein stilles Verstecken.
      return
    }

    card.value.setProperty(hmUI.prop.MORE, {
      text: pair(m.used, m.total) + '  ·  ' + percent(m.ratio),
      color: loadColor(m.ratio),
    })
    card.progress && card.progress.update(m.ratio, loadColor(m.ratio))
  },

  refreshBattery() {
    const level = readBattery()
    const w = this.state.widgets.battery
    if (!w) return
    w.setProperty(
      hmUI.prop.MORE,
      level === null
        ? { text: '' }
        : { text: getText('battery') + ' ' + level + ' %' }
    )
  },

  onDestroy() {
    this.state.timers.forEach(clearInterval)
    this.state.timers = []
    if (this.state.offBattery) this.state.offBattery()
    logger.debug('home destroyed')
  },
})
