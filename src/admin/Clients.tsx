import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useGym } from '../data/store'
import { PLANS, dueInfo, normalizeCarnet } from '../lib/domain'
import { formatDate, formatShortDate } from '../lib/dates'
import { Avatar, Card, inputCls, Pill } from '../components/ui'
import { useWide } from '../lib/media'
import { AdminHeader, td, th } from './AdminLayout'

type Tone = 'danger' | 'amber' | 'muted'
const STATE: Record<string, { label: string; tone: Tone }> = {
  vencido: { label: 'Vencido', tone: 'danger' },
  hoy: { label: 'Vence hoy', tone: 'amber' },
  pronto: { label: 'Por vencer', tone: 'amber' },
  aldia: { label: 'Al día', tone: 'muted' },
}

export function Clients() {
  const g = useGym()
  const wide = useWide()
  const [q, setQ] = useState('')
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return g.clients
      .filter((c) => !t || c.name.toLowerCase().includes(t) || c.phone.includes(t) || (normalizeCarnet(t).length >= 3 && c.carnet.includes(normalizeCarnet(t))))
      .sort((a, b) => a.nextDue.localeCompare(b.nextDue))
  }, [g.clients, q])
  const plan = (id: string) => PLANS.find((p) => p.id === id)?.label
  const st = (nextDue: string) => STATE[dueInfo(nextDue, g.today).state]

  return (
    <>
      <AdminHeader eyebrow="Miembros" title="Clientes" action={
        <div className="relative w-full sm:w-72">
          <Search size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
          <input type="search" aria-label="Buscar cliente" placeholder="Nombre, carnet o teléfono" value={q} onChange={(e) => setQ(e.target.value)} className={`${inputCls} !h-12 pl-11`} />
        </div>
      } />

      {/* Móvil: tarjetas de dos líneas */}
      {!wide && <ul className="space-y-2">
        {rows.map((c) => {
          const s = st(c.nextDue)
          return (
            <li key={c.id}>
              <Card className="!rounded-2xl !p-3">
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold leading-tight">{c.name}</p>
                    <p className="truncate text-xs text-muted">{c.carnet} · {c.phone}</p>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 pl-[52px]">
                  <p className="text-xs text-faint">{plan(c.plan)} · vence {formatShortDate(c.nextDue, g.settings.locale)}</p>
                  <Pill tone={s.tone}>{s.label}</Pill>
                </div>
              </Card>
            </li>
          )
        })}
        {rows.length === 0 && <li className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">Sin resultados.</li>}
      </ul>}

      {/* Escritorio: tabla */}
      {wide && <div className="overflow-x-auto rounded-3xl border border-line surface-card">
        <table className="w-full min-w-[640px]">
          <thead><tr className="border-b border-line"><th className={th}>Cliente</th><th className={th}>Carnet</th><th className={th}>Teléfono</th><th className={th}>Plan</th><th className={th}>Vence</th><th className={th}>Estado</th></tr></thead>
          <tbody>
            {rows.map((c) => {
              const s = st(c.nextDue)
              return (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className={td}><div className="flex items-center gap-3"><Avatar name={c.name} size={36} /><span className="font-semibold">{c.name}</span></div></td>
                  <td className={td}>{c.carnet}</td>
                  <td className={`${td} text-muted`}>{c.phone}</td>
                  <td className={td}>{plan(c.plan)}</td>
                  <td className={td}>{formatDate(c.nextDue, g.settings.locale)}</td>
                  <td className={td}><Pill tone={s.tone}>{s.label}</Pill></td>
                </tr>
              )
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted">Sin resultados.</td></tr>}
          </tbody>
        </table>
      </div>}
    </>
  )
}
