import type { PlanId } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parseISODate(s)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Suma meses sin desbordar (31 ene + 1 mes = 28/29 feb). */
export function addMonths(s: string, n: number): string {
  const d = parseISODate(s)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return toISODate(d)
}

export function addPlan(s: string, plan: PlanId): string {
  switch (plan) {
    case 'dia': return addDays(s, 1)
    case 'semana': return addDays(s, 7)
    case 'mes': return addMonths(s, 1)
    case 'anio': return addMonths(s, 12)
  }
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseISODate(a).getTime() - parseISODate(b).getTime()) / 86_400_000)
}

export function formatDate(s: string, locale = 'es-MX'): string {
  return parseISODate(s)
    .toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    .replace(/\./g, '')
}

export function formatShortDate(s: string, locale = 'es-MX'): string {
  return parseISODate(s).toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace(/\./g, '')
}
