const KB = 1024
const MB = KB * 1024
const GB = MB * 1024

/** Bytes lesbar formatieren, 3 signifikante Stellen. */
export function bytes(n) {
  if (n === null || n === undefined) return '—'
  if (n < KB) return n + ' B'
  if (n < MB) return round(n / KB) + ' KB'
  if (n < GB) return round(n / MB) + ' MB'
  return round(n / GB) + ' GB'
}

function round(v) {
  if (v >= 100) return String(Math.round(v))
  if (v >= 10) return v.toFixed(1)
  return v.toFixed(2)
}

export function percent(ratio, digits = 0) {
  if (ratio === null || ratio === undefined) return '—'
  return (ratio * 100).toFixed(digits) + ' %'
}

/** "12,4 / 32,0 GB" — beide Werte in der Einheit des groesseren. */
export function pair(used, total) {
  return bytes(used) + ' / ' + bytes(total)
}
