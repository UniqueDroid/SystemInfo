# SystemInfo

A Zepp OS Mini App that shows the watch's system state at a glance: storage usage, memory, battery and device/firmware info. Built for the **Amazfit Bip Max** (device code `PikeW`, square display).

Full concept: [`KONZEPT.md`](KONZEPT.md) (German).

## Status (19.08.2026)

First build compiles clean end to end - all 4 pages (home/storage/memory/device), both locales (en-US/de-DE), circular app icon. Not yet installed on a real device.

## Design principles

- **No fake htop.** Only shows what the Zepp OS APIs actually deliver, honestly labeled. Three reliability tiers, distinguished in the UI: **measured** (normal color), **not available** (greyed out + note, never silently hidden), **estimated** (yellow, own proxy measurement).
- **Capability detection everywhere** (`lib/metrics.js`'s `caps` object) - `getPerformance('memory')` only exists from API level 4.0 onward, `getDiskInfo()` from 2.0. A card for an unavailable API stays visible and explains why, instead of being hidden - so the same build behaves predictably across different watches.
- **"Responsiveness", never "CPU usage".** There's no scheduler/load API in the sandbox - the app runs a manual busy-loop probe instead, normalized against a per-device baseline calibrated once and cached in `localStorage`. Deliberately manual-trigger only, never on a timer (a busy loop draining battery in the background would defeat the point of a system-info app).

## Project structure

```
app.json              # Target "PikeW" (Amazfit Bip Max)
app.js                 # App lifecycle (no Side Service - everything reads local device APIs)
lib/
  metrics.js           # The only file that touches Zepp OS system APIs directly, with capability detection
  theme.js              # Colors, sizing, small widget helpers (text/rect/bar/stackedBar)
  format.js              # Byte/percent formatting
page/
  home/index.js          # Overview: three tappable cards + battery
  storage/index.js        # Stacked bar + legend (app/watchface/music/system/other/free)
  memory/index.js          # System RAM bar, per-app usage, leak list, responsiveness probe
  device/index.js           # Model, screen, firmware, API level, capability flags
  i18n/de-DE.po, en-US.po    # Shared translations for all 4 pages
assets/logo.svg              # Icon source (circular, per Zepp's store icon spec)
```

## Building

```
npm install -g @zeppos/zeus-cli   # if not already installed globally
zeus build
```

Sideload-testing via a `zpkd1://` QR code (no `zeus login`/bridge needed) works the same way as in the [SmartLock](https://github.com/UniqueDroid/Nuki-Smartlock-ZeppOS) project - see that repo's README for the full explanation of the mechanism and its gotchas (must point at the inner `.zpk`, not the outer `.zab`; pin jsDelivr URLs to a commit SHA, not `@main`).

## Not implemented yet

- Real-device verification (colors, layout, actual API responses - especially whether `getDiskInfo()`'s `music` field is `0` or `undefined` on devices without music storage, per the concept doc's open question).
- `pair()` in `lib/format.js` doesn't actually normalize both values to the same unit yet despite its docstring saying so (e.g. could print "512 KB / 2.00 GB") - cosmetic, not yet fixed.
