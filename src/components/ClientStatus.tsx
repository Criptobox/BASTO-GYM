import { dueInfo, isFrozen } from '../lib/domain'
import type { Client } from '../lib/types'
import { Pill } from './ui'

type Tone = 'danger' | 'amber' | 'muted'
const STATE: Record<string, { label: string; tone: Tone }> = {
  vencido: { label: 'Vencido', tone: 'danger' },
  hoy: { label: 'Vence hoy', tone: 'amber' },
  pronto: { label: 'Por vencer', tone: 'amber' },
  aldia: { label: 'Al día', tone: 'muted' },
}

/** Estado de una membresía para mostrar en una pastilla. Congelada manda sobre el vencimiento. */
export const statusOf = (c: Client, today: string): { label: string; tone: Tone } =>
  isFrozen(c) ? { label: 'Congelada', tone: 'muted' } : STATE[dueInfo(c.nextDue, today).state]

export function StatusPill({ client, today }: { client: Client; today: string }) {
  const s = statusOf(client, today)
  return <Pill tone={s.tone}>{s.label}</Pill>
}
