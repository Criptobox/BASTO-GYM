import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useGym } from '../data/store'
import { PLANS, dueInfo, normalizeCarnet } from '../lib/domain'
import { formatDate } from '../lib/dates'
import { Avatar, inputCls, Pill } from '../components/ui'
import { AdminHeader, td, th } from './AdminLayout'

export function Clients() {
  const g = useGym()
  const [q, setQ] = useState('')
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return g.clients
      .filter((c) => !t || c.name.toLowerCase().includes(t) || c.phone.includes(t) || (normalizeCarnet(t).length >= 3 && c.carnet.includes(normalizeCarnet(t))))
      .sort((a, b) => a.nextDue.localeCompare(b.nextDue))
  }, [g.clients, q])
  return (
    <>
      <AdminHeader eyebrow="Miembros" title="Clientes" action={
        <div className="relative w-72">
          <Search size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
          <input type="search" aria-label="Buscar cliente" placeholder="Nombre, carnet o teléfono" value={q} onChange={(e) => setQ(e.target.value)} className={`${inputCls} !h-12 pl-11`} />
        </div>
      } />
      <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
        <table className="rtable w-full md:min-w-[620px]">
          <thead><tr className="border-b border-line"><th className={th}>Cliente</th><th className={th}>Carnet</th><th className={th}>Teléfono</th><th className={th}>Plan</th><th className={th}>Vence</th><th className={th}>Estado</th></tr></thead>
          <tbody>
            {rows.map((c) => {
              const i = dueInfo(c.nextDue, g.today)
              return (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td data-label="Cliente" className={td}><div className="flex items-center gap-3"><Avatar name={c.name} size={36} /><span className="font-semibold">{c.name}</span></div></td>
                  <td data-label="Carnet" className={td}>{c.carnet}</td>
                  <td data-label="Teléfono" className={`${td} text-muted`}>{c.phone}</td>
                  <td data-label="Plan" className={td}>{PLANS.find((p) => p.id === c.plan)?.label}</td>
                  <td data-label="Vence" className={td}>{formatDate(c.nextDue, g.settings.locale)}</td>
                  <td data-label="Estado" className={td}><Pill tone={i.state === 'vencido' ? 'white' : i.state === 'hoy' || i.state === 'pronto' ? 'amber' : 'muted'}>{i.state === 'vencido' ? 'Vencido' : i.state === 'hoy' ? 'Vence hoy' : i.state === 'pronto' ? 'Por vencer' : 'Al día'}</Pill></td>
                </tr>
              )
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted">Sin resultados.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
