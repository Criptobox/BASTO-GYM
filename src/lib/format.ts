import type { Settings } from './types'

/** usd(25) → "US$25.00"   ·   mn(3000) → "3,000 MN" */
export function makeMoney(s: Pick<Settings, 'locale'>) {
  const u = new Intl.NumberFormat(s.locale, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const m = new Intl.NumberFormat(s.locale, { maximumFractionDigits: 0 })
  const plain = new Intl.NumberFormat(s.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  // *Num: solo el número, para cuando la etiqueta ya dice la moneda.
  return { usd: (n: number) => u.format(n), mn: (n: number) => `${m.format(n)} MN`, mnNum: (n: number) => m.format(n), usdNum: (n: number) => plain.format(n) }
}

export function formatTime(iso: string, locale = 'es-CU') {
  return new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, ' ')
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
