# SystemInfo — Konzept

Eine Zepp OS Mini-App, die den Systemzustand der Uhr auf einen Blick zeigt:
Speicherbelegung, Arbeitsspeicher, Akku und Geräte-/Firmware-Daten.

---

## 1. Leitgedanke

Zepp OS gibt Entwicklern nur einen schmalen Ausschnitt auf den Systemzustand frei.
Die App macht daraus bewusst **kein Fake-htop**, sondern zeigt genau das, was das
System tatsächlich hergibt — sauber aufbereitet, ehrlich beschriftet, und mit
klarer Kennzeichnung dort, wo ein Wert nur geschätzt ist.

Drei Verlässlichkeitsstufen, die sich auch im UI unterscheiden:

| Stufe | Bedeutung | Darstellung |
|---|---|---|
| **Gemessen** | Direkt vom System geliefert | normale Farbe |
| **Nicht verfügbar** | API auf diesem Gerät nicht vorhanden | ausgegraut + Hinweis |
| **Geschätzt** | Eigener Proxy-Messwert | gelbe Markierung + „~" |

---

## 2. Datenquellen

### Speicher — vollständig verfügbar
`getDiskInfo()` aus `@zos/device`, ab API_LEVEL 2.0. Liefert in Bytes:
`total`, `free`, `app`, `watchface`, `music`, `system`.

Das ist die stärkste Datenquelle der App: eine echte, vom System gelieferte
Aufschlüsselung nach Kategorien. Daraus wird das Herzstück des UI — ein
gestapelter Balken mit fünf Segmenten.

Achtung: `app + watchface + music + system + free` ergibt meist **nicht** exakt
`total` (Dateisystem-Overhead, Logs, Health-Daten). Die Differenz wird als
eigene Kategorie „Sonstiges" geführt, statt sie stillschweigend wegzurunden.

### Arbeitsspeicher — ab API_LEVEL 4.0
`getPerformance('memory')` aus `@zos/app`:

- `memory.system` → `{ used, total }`
- `memory.app[]` → pro Mini-Program `{ appid, used, peak, modules[] }`
- `memory.leaking[]` → nicht freigegebener Speicher, gleiche Struktur

Das ist eigentlich eine Profiling-API, taugt aber gut als Systemanzeige.
Auf Geräten unter API_LEVEL 4.0 ist der Import schlicht `undefined` — die
Karte wird dann als „nicht verfügbar" gerendert, nicht versteckt. Ein
sichtbarer, erklärter Leerzustand ist besser als eine Karte, die auf einem
Gerät da ist und auf dem anderen nicht.

`getPerformance('perf')` liefert zusätzlich Ladezeiten pro Modul
(`evalTime`, `createTime`, `initTime`, `buildTime`) — nur für die eigene App,
darum als Entwickler-Detail auf der RAM-Seite.

### Akku
`Battery` aus `@zos/sensor` — `getCurrent()` plus `onChange()`-Callback.

### Geräteinfo
`getDeviceInfo()` aus `@zos/device` und `getSystemInfo()` aus `@zos/settings`
(ab 2.1, ebenfalls Existenzprüfung nötig).

### CPU — gibt es nicht
Kein Scheduler-, Load- oder Prozess-Zugriff in der Sandbox. Die App bietet
stattdessen einen **Responsiveness-Test**: eine Busy-Loop zählt Iterationen in
einem festen Zeitfenster, das Ergebnis wird gegen einen beim Erststart
kalibrierten Baseline-Wert normiert.

Bewusste Design-Entscheidungen dazu:

- Heißt im UI **„Reaktionsfähigkeit"**, nie „CPU-Auslastung".
- Läuft **nur auf Knopfdruck**, nie im Poll-Intervall — eine Busy-Loop im
  Hintergrund ist ein Akkufresser.
- Baseline wird pro Gerät einmal gemessen und in `localStorage` abgelegt,
  weil sich z. B. GTS 4 und Balance deutlich unterscheiden.
- Ergebnis als Prozentwert relativ zur Baseline, mit „~" davor.

---

## 3. Navigation

Vier Seiten, flach, kein Scrolling nötig:

```
home  ──tap──▶  storage
      ──tap──▶  memory
      ──tap──▶  device
```

**Home** ist die Übersicht: drei tappbare Zeilen, jede mit Titel, Kennzahl und
einem schmalen Fortschrittsbalken. Darüber der Akkustand. Alles passt ohne
Scroll auf ein 480×480-Display — damit entfällt jede Abhängigkeit von
Scroll-APIs, die sich zwischen den OS-Versionen unterscheiden.

Zurück läuft über die System-Swipe-Geste, kein eigener Back-Button.

**Storage** zeigt den gestapelten Balken groß, darunter die Legende mit
absoluten Werten und Prozentanteil je Kategorie.

**Memory** zeigt System-RAM als Balken, darunter die Liste der Apps mit
`used`/`peak`, Leaks rot markiert. Ganz unten die eigenen Ladezeiten.

**Device** ist eine reine Key-Value-Liste: Modell, Auflösung, Displayform,
Firmware, API-Level, verfügbare Capabilities.

---

## 4. Aktualisierung

| Wert | Intervall | Begründung |
|---|---|---|
| Disk | 10 s | ändert sich selten, Aufruf ist nicht gratis |
| Memory | 2 s | die interessante Live-Größe |
| Akku | event-basiert | `onChange()` statt Polling |
| Responsiveness | manuell | Akkukosten |

Timer werden in `build()` gestartet und in `onDestroy()` sauber abgeräumt.
Bei ausgeschaltetem Display friert Zepp OS die JS-Ausführung ohnehin ein, ein
eigenes Sichtbarkeits-Handling ist also nicht nötig.

Wichtig fürs UI: Widgets werden **einmal erzeugt** und danach per
`setProperty(prop.MORE, …)` aktualisiert. Widgets im Intervall neu zu erzeugen
führt zuverlässig zu Rucklern und wachsendem Speicherverbrauch.

---

## 5. Visuelles

Dunkler Hintergrund (AMOLED, spart Strom), Karten in `0x14141a`,
Radius 12 px auf 480er-Designbreite.

Farben pro Kategorie, konsequent über alle Seiten gleich:

| Kategorie | Farbe |
|---|---|
| Apps | `0x4a9eff` blau |
| Watchfaces | `0xa06eff` violett |
| Musik | `0x38c98d` grün |
| System | `0xff9f0a` orange |
| Sonstiges | `0x6e6e78` grau |
| Frei | `0x2a2a32` sehr dunkel |
| Warnung / Leak | `0xff453a` rot |
| Geschätzt | `0xffd60a` gelb |

Schwellwerte: ab 85 % Belegung färbt sich die Kennzahl orange, ab 95 % rot.

---

## 6. Dateistruktur

```
app.json                 Manifest, Permissions, Targets
app.js                   App-Lifecycle
lib/metrics.js           Datenschicht + Capability-Detection
lib/format.js            Byte-/Prozentformatierung
lib/theme.js             Farben, Maße, Widget-Helper
page/home/index.js       Übersicht
page/storage/index.js    Speicherdetails
page/memory/index.js     RAM-Details
page/device/index.js     Geräteinfo
i18n/de-DE.po            Übersetzungen
i18n/en-US.po
```

Die gesamte API-Berührungsfläche liegt in `lib/metrics.js`. Alle Seiten
arbeiten nur mit dem normalisierten Objekt, das die Schicht zurückgibt —
inklusive `caps`-Flags. Neue Zepp-OS-Versionen mit weiteren APIs kosten damit
genau eine Datei Anpassung.

---

## 7. Berechtigungen

In `app.json`:

```json
"permissions": ["data:os.device.info"]
```

Fällt im Simulator nicht auf, auf der Uhr sehr wohl.

---

## 8. Kompatibilität

| Gerät / OS | Speicher | RAM | Akku | Gerät |
|---|---|---|---|---|
| Zepp OS 2.x | ✅ | ❌ | ✅ | teilweise |
| Zepp OS 3.x | ✅ | ❌ | ✅ | ✅ |
| Zepp OS 4.x+ | ✅ | ✅ | ✅ | ✅ |

`minVersion` im Manifest auf `2.0` setzen, damit die App breit läuft — die
RAM-Karte degradiert dann sauber.

---

## 9. Offene Punkte vor dem ersten Build

- `getSystemInfo()` ist nur mit dem Feld `minAPI` dokumentiert; welche
  weiteren Felder das Objekt trägt, am besten einmal auf dem Gerät loggen und
  `page/device` danach ausbauen.
- `getDiskInfo()` einmal gegen die Zepp-App gegenprüfen — ob `music` auf
  Geräten ohne Musikspeicher `0` oder `undefined` liefert.
- Der `targets`-Block im Manifest hängt an den Geräten, die du bedienen
  willst; am einfachsten aus dem bestehenden Projekt übernehmen, statt ihn
  von Hand zu schreiben.
