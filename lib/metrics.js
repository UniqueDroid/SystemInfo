import { getDiskInfo, getDeviceInfo } from '@zos/device'
import * as app from '@zos/app'
import * as settings from '@zos/settings'
import { Battery } from '@zos/sensor'
import { localStorage } from '@zos/storage'

// --- Capability-Detection ---------------------------------------------------
// Auf aelteren Firmwares existieren diese Symbole schlicht nicht. Niemals
// blind aufrufen, sonst reisst ein ReferenceError die Page mit.

export const caps = {
  disk: typeof getDiskInfo === 'function',
  memory: typeof app.getPerformance === 'function', // API_LEVEL 4.0
  systemInfo: typeof settings.getSystemInfo === 'function', // API_LEVEL 2.1
}

// --- Speicher ---------------------------------------------------------------

export function readDisk() {
  if (!caps.disk) return null

  const d = getDiskInfo()
  const total = d.total || 0
  const free = d.free || 0
  const known = ['app', 'watchface', 'music', 'system'].map((k) => ({
    key: k,
    bytes: d[k] || 0,
  }))

  // Summe der Kategorien deckt total selten exakt ab (FS-Overhead, Logs,
  // Health-Daten). Rest ehrlich als eigene Kategorie fuehren, nicht verstecken.
  const accounted = known.reduce((s, c) => s + c.bytes, 0) + free
  const other = Math.max(0, total - accounted)

  return {
    total,
    free,
    used: total - free,
    ratio: total ? (total - free) / total : 0,
    segments: [...known, { key: 'other', bytes: other }],
  }
}

// --- Arbeitsspeicher --------------------------------------------------------

export function readMemory() {
  if (!caps.memory) return null

  let raw
  try {
    raw = app.getPerformance('memory')
  } catch (e) {
    return null
  }
  if (!raw || !raw.memory) return null

  const m = raw.memory
  const sys = m.system || { used: 0, total: 0 }

  return {
    used: sys.used || 0,
    total: sys.total || 0,
    ratio: sys.total ? sys.used / sys.total : 0,
    apps: m.app || [],
    leaking: m.leaking || [],
  }
}

export function readPerf() {
  if (!caps.memory) return null
  try {
    const raw = app.getPerformance('perf')
    return raw && raw.perf ? raw.perf : null
  } catch (e) {
    return null
  }
}

// --- Akku -------------------------------------------------------------------

let batterySensor = null

function battery() {
  if (!batterySensor) batterySensor = new Battery()
  return batterySensor
}

export function readBattery() {
  try {
    return battery().getCurrent()
  } catch (e) {
    return null
  }
}

export function onBatteryChange(cb) {
  try {
    battery().onChange(cb)
    return () => battery().offChange(cb)
  } catch (e) {
    return () => {}
  }
}

// --- Geraet -----------------------------------------------------------------

export function readDevice() {
  const info = {}
  try {
    Object.assign(info, getDeviceInfo())
  } catch (e) {}

  if (caps.systemInfo) {
    try {
      Object.assign(info, settings.getSystemInfo())
    } catch (e) {}
  }
  return info
}

// --- Reaktionsfaehigkeit ----------------------------------------------------
// KEINE CPU-Auslastung. Gemessen wird, wie viele Schleifendurchlaeufe die
// eigene App in einem festen Zeitfenster schafft — also wie viel JS-Zeit das
// Framework uns gerade laesst. Nur manuell ausloesen, das kostet Akku.

const BASELINE_KEY = 'responsiveness_baseline'
const WINDOW_MS = 50

function spin(ms) {
  const end = Date.now() + ms
  let n = 0
  while (Date.now() < end) n++
  return n
}

export function calibrate() {
  // Bester von drei Laeufen — der schnellste ist der ungestoerteste.
  const best = Math.max(spin(WINDOW_MS), spin(WINDOW_MS), spin(WINDOW_MS))
  localStorage.setItem(BASELINE_KEY, String(best))
  return best
}

export function getBaseline() {
  const v = parseInt(localStorage.getItem(BASELINE_KEY, '0'), 10)
  return v > 0 ? v : null
}

/** @returns {{ score: number, iterations: number, baseline: number }} */
export function measureResponsiveness() {
  const baseline = getBaseline() || calibrate()
  const iterations = spin(WINDOW_MS)
  return {
    iterations,
    baseline,
    score: Math.min(1, iterations / baseline),
  }
}

// --- Sammelabruf ------------------------------------------------------------

export function snapshot() {
  return {
    caps,
    disk: readDisk(),
    memory: readMemory(),
    battery: readBattery(),
  }
}
