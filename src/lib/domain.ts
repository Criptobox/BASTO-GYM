import { addPlan, diffDays } from './dates'
import type { Client, Method, Movement, PlanId } from './types'

export const PLANS: { id: PlanId; label: string; days: string }[] = [
  { id: 'dia', label: 'Día', days: '1 día' },
  { id: 'semana', label: 'Semanal', days: '7 días' },
  { id: 'mes', label: 'Mensual', days: '1 mes' },
  { id: 'anio', label: 'Anual', days: '12 meses' },
]

export const METHODS: { id: Method; label: string }[] = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'transferencia', label: 'Transferencia' },
]

export type DueState = 'vencido' | 'hoy' | 'pronto' | 'aldia'

export interface DueInfo {
  state: DueState
  days: number // negativo = vencido
  text: string
}

export function dueInfo(nextDue: string, today: string): DueInfo {
  const days = diffDays(nextDue, today)
  if (days < 0) {
    const n = -days
    return { state: 'vencido', days, text: `Venció hace ${n} ${n === 1 ? 'día' : 'días'}` }
  }
  if (days === 0) return { state: 'hoy', days, text: 'Vence hoy' }
  if (days <= 3) return { state: 'pronto', days, text: `Vence en ${days} ${days === 1 ? 'día' : 'días'}` }
  return { state: 'aldia', days, text: `Al día · vence en ${days} días` }
}

/** Clientes que requieren cobro (vencidos o que vencen hoy), los más atrasados primero. */
export function pendingClients(clients: Client[], today: string): Client[] {
  return clients
    .filter((c) => diffDays(c.nextDue, today) <= 0)
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue))
}

/**
 * Nueva fecha de vencimiento al pagar: si ya venció se cuenta desde hoy
 * (no se regalan días); si paga por adelantado se suma al vencimiento actual.
 */
export function renewalDate(nextDue: string, plan: PlanId, today: string): string {
  const base = diffDays(nextDue, today) < 0 ? today : nextDue
  return addPlan(base, plan)
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export type CashStatus = 'cuadra' | 'faltante' | 'sobrante'

export interface ShiftSummary {
  memberships: { count: number; total: number }
  sales: { count: number; total: number }
  byMethod: Record<Method, number>
  total: number
}

export function summarize(movements: Movement[]): ShiftSummary {
  const s: ShiftSummary = {
    memberships: { count: 0, total: 0 },
    sales: { count: 0, total: 0 },
    byMethod: { efectivo: 0, tarjeta: 0, transferencia: 0 },
    total: 0,
  }
  for (const m of movements) {
    const bucket = m.kind === 'mensualidad' ? s.memberships : s.sales
    bucket.count++
    bucket.total += m.amount
    s.byMethod[m.method] += m.amount
    s.total += m.amount
  }
  return s
}

/** Diferencia en centavos enteros para evitar errores de coma flotante. */
export function cashDifference(counted: number, expected: number): { status: CashStatus; amount: number } {
  const diff = Math.round(counted * 100) - Math.round(expected * 100)
  if (diff === 0) return { status: 'cuadra', amount: 0 }
  return { status: diff < 0 ? 'faltante' : 'sobrante', amount: Math.abs(diff) / 100 }
}

/** Enlace de WhatsApp con mensaje listo para enviar. */
export function whatsappLink(phone: string, countryCode: string, message: string): string {
  let digits = phone.replace(/\D/g, '')
  if (!digits.startsWith(countryCode) || digits.length <= 10) digits = countryCode + digits
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function reminderMessage(name: string, info: DueInfo, gymName: string): string {
  const first = name.split(' ')[0]
  const when =
    info.state === 'vencido' ? 'ya venció' : info.state === 'hoy' ? 'vence hoy' : `vence en ${info.days} días`
  return `Hola ${first}, te escribimos de ${gymName}. Tu membresía ${when}. ¡Te esperamos para renovarla y seguir entrenando! 💪`
}
