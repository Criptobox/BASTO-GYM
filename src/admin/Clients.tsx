import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useGym } from '../data/store'
import { PLANS, normalizeCarnet } from '../lib/domain'
import { formatDate, formatShortDate } from '../lib/dates'
import { Avatar, Card, inputCls } from '../components/ui'
import { ClientSheet } from '../components/ClientDetail'
import { StatusPill } from '../components/ClientStatus'
import { useWide } from '../lib/media'
import { AdminHeader, td, th } from './AdminLayout'

export function Clients() {
  const g = useGym()
  const wide = useWide()
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState<string | null>(null)
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return g.clients
      .filter((c) => !t || c.name.toLowerCase().includes(t) || c.phone.includes(t) || (normalizeCarnet(t).length >= 3 && c.carnet.includes(normalizeCarnet(t))))
      .sort((a, b) => a.nextDue.localeCompare(b.nextDue))
  }, [g.clients, q])
  const plan = (id: string) => PLANS.find((p) => p.id === id)?.label

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
          return (
            <li key={c.id}>
              <Card className="!rounded-2xl !p-3">
                <button onClick={() => setDetail(c.id)} aria-label={`Ver ficha de ${c.name}`} className="absolute inset-0 z-10 rounded-2xl" />
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold leading-tight">{c.name}</p>
                    <p className="truncate text-xs text-muted">{c.carnet} · {c.phone}</p>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 pl-[52px]">
                  <p className="text-xs text-faint">{plan(c.plan)} · vence {formatShortDate(c.nextDue, g.settings.locale)}</p>
                  <StatusPill client={c} today={g.today} />
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
              return (
                <tr key={c.id} onClick={() => setDetail(c.id)} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-2">
                  <td className={td}><button onClick={(e) => { e.stopPropagation(); setDetail(c.id) }} className="flex items-center gap-3 text-left"><Avatar name={c.name} size={36} /><span className="font-semibold">{c.name}</span></button></td>
                  <td className={td}>{c.carnet}</td>
                  <td className={`${td} text-muted`}>{c.phone}</td>
                  <td className={td}>{plan(c.plan)}</td>
                  <td className={td}>{formatDate(c.nextDue, g.settings.locale)}</td>
                  <td className={td}><StatusPill client={c} today={g.today} /></td>
                </tr>
              )
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted">Sin resultados.</td></tr>}
          </tbody>
        </table>
      </div>}
      <ClientSheet clientId={detail} onClose={() => setDetail(null)} />
    </>
  )
}
