import type { Settings } from './types'

export function makeMoney(s: Pick<Settings, 'currency' | 'locale'>) {
  const f = new Intl.NumberFormat(s.locale, { style: 'currency', currency: s.currency, minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return (n: number) => f.format(n)
}

export function formatTime(iso: string, locale = 'es-MX') {
  return new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, ' ')
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
