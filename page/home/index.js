import * as hmUI from '@zos/ui'
import { push } from '@zos/router'
import { px } from '@zos/utils'
import { getText } from '@zos/i18n'
import { log as Logger } from '@zos/utils'

import { W, COLOR, text } from '../../lib/theme'
import { caps, readBattery, onBatteryChange } from '../../lib/metrics'

const logger = Logger.getLogger('systeminfo/home')

const M = px(30) // Seitenrand
const CARD_W = W - M * 2
const CARD_H = px(88)

Page({
  state: {
    widgets: {},
    offBattery: null,
  },

  build() {
    // War die einzige Stelle im ganzen Projekt, die das ueberhaupt
    // aufruft - Storage/Memory/Device rufen es nie und rendern
    // korrekt. Genau die Home-Seite war es, deren Karten trotz
    // mehrerer Farb-/Layout-Fixes komplett unsichtbar blieben. Der
    // Statusbalken (App-Name+Uhrzeit oben) ist laut den Screenshots
    // ohnehin auf jeder Seite immer da, auch ohne diesen Aufruf -
    // vermutlich ein Geraete-/Firmware-Bug, bei dem er als opake
    // Full-Screen-Overlay ueber allem landet statt nur oben.
    this.buildHeader()

    // Karten waren vorher Rect+Text+Balken+transparenter Button
    // gestapelt (fuer eine Live-Vorschau von Wert/Fuellstand direkt
    // auf der Uebersicht) - genau dieses Stapeln hat abwechselnd die
    // Sichtbarkeit oder die Klickbarkeit kaputt gemacht. Jan: "mach's
    // wie bei Nuki, da funktioniert alles" - dort ist der Button das
    // einzige Widget in seinem Bereich, kein Overlap moeglich. Home
    // zeigt jetzt nur noch Titel als Button-Label, die Werte gibt's
    // auf der jeweiligen Unterseite (die haben live Werte + Balken).
    let y = px(84)
    this.buildCard({ y, title: getText('storage'), route: 'page/storage/index', disabled: !caps.disk })

    y += CARD_H + px(14)
    this.buildCard({ y, title: getText('memory'), route: 'page/memory/index', disabled: !caps.memory })

    y += CARD_H + px(14)
    this.buildCard({ y, title: getText('device'), route: 'page/device/index' })

    this.refreshBattery()
    this.state.offBattery = onBatteryChange(() => this.refreshBattery())
  },

  buildHeader() {
    // Der App-Name stand vorher hier nochmal extra, obwohl der
    // Statusbalken (App-Name+Uhrzeit) ihn oben schon zeigt - Jan:
    // "das kann weg". Nur noch der Akku-Stand bleibt als eigene Zeile.
    this.state.widgets.battery = text({
      x: M,
      y: px(36),
      w: CARD_W,
      h: px(30),
      text: '',
      text_size: px(24),
      color: COLOR.textDim,
    })
  },

  buildCard({ y, title, route, disabled = false }) {
    if (disabled) {
      // Kein Tap-Ziel ohne Daten dahinter - aber sichtbar und
      // erklaert sich, statt sich stillschweigend zu verstecken.
      hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: M,
        y,
        w: CARD_W,
        h: CARD_H,
        radius: px(16),
        color: COLOR.card,
      })
      text({
        x: M,
        y,
        w: CARD_W,
        h: CARD_H,
        text: title + '\n' + getText('unavailable'),
        text_size: px(24),
        color: COLOR.textDim,
        align_h: hmUI.align.CENTER_H,
        text_style: hmUI.text_style.WRAP,
      })
      return
    }

    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: M,
      y,
      w: CARD_W,
      h: CARD_H,
      radius: px(16),
      normal_color: COLOR.card,
      press_color: COLOR.cardPress,
      text_size: px(28),
      color: COLOR.text,
      text: title,
      click_func: () => push({ url: route }),
    })
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
    if (this.state.offBattery) this.state.offBattery()
    logger.debug('home destroyed')
  },
})
