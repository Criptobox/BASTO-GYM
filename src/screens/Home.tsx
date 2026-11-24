import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useGym } from '../data/store'
import { dueInfo, normalizeCarnet, pendingClients, summarize } from '../lib/domain'
import { formatTime, makeMoney, plural } from '../lib/format'
import { Avatar, Button, Card, inputCls, Pill, Screen } from '../components/ui'
import { PaySheet } from '../components/PaySheet'
import type { Client } from '../lib/types'

export function Home() {
  const g = useGym()
  const nav = useNavigate()
  const money = makeMoney(g.settings)
  const [q, setQ] = useState('')
  const [paying, setPaying] = useState<Client | null>(null)
  const sum = summarize(g.shiftMovements)

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return pendingClients(g.clients, g.today)
    const digits = term.replace(/\D/g, '')
    const carnet = normalizeCarnet(term)
    return g.clients.filter(
      (c) => c.name.toLowerCase().includes(term) || (digits && c.phone.replace(/\D/g, '').includes(digits)) || (carnet.length >= 3 && c.carnet.includes(carnet)),
    )
  }, [q, g.clients, g.today])

  return (
    <Screen
      eyebrow={g.shiftOpen ? `Turno abierto · desde ${formatTime(g.shift.openedAt, g.settings.locale)}` : 'Turno cerrado'}
      title={`Hola, ${g.settings.worker}`}
    >
      <div className="rounded-3xl bg-amber p-5 text-amber-ink">
        <p className="text-sm font-semibold">En caja ahora (efectivo)</p>
        <p className="text-[44px] font-extrabold leading-tight tracking-tight">{money(sum.byMethod.efectivo)}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Card>
          <p className="text-sm text-muted">Mensualidades</p>
          <p className="text-2xl font-extrabold tracking-tight">{money(sum.memberships.total)}</p>
          <p className="text-xs text-muted">{plural(sum.memberships.count, 'cobro', 'cobros')}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Ventas</p>
          <p className="text-2xl font-extrabold tracking-tight">{money(sum.sales.total)}</p>
          <p className="text-xs text-muted">{plural(sum.sales.count, 'venta', 'ventas')}</p>
        </Card>
      </div>

      <div className="relative mt-4">
        <Search size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
        <input
          type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Nombre, carnet o teléfono" aria-label="Buscar cliente"
          className={`${inputCls} pl-11`}
        />
      </div>

      <h2 className="mb-3 mt-6 text-xs font-bold uppercase tracking-[0.14em] text-amber">
        {q ? `Resultados (${list.length})` : 'Por cobrar hoy'}
      </h2>
      <ul className="space-y-3">
        {list.map((c) => {
          const info = dueInfo(c.nextDue, g.today)
          const due = info.state === 'vencido' || info.state === 'hoy'
          return (
            <li key={c.id}>
              <Card className="flex items-center gap-3 !p-3.5">
                <Avatar name={c.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{c.name}</p>
                  <p className="text-sm text-muted">{info.text}</p>
                </div>
                {due || q ? (
                  <Button variant="outline" size="sm" disabled={!g.shiftOpen} onClick={() => setPaying(c)}>Cobrar</Button>
                ) : <Pill>Al día</Pill>}
              </Card>
            </li>
          )
        })}
        {list.length === 0 && (
          <li className="rounded-3xl border border-dashed border-line p-8 text-center text-muted">
            {q ? 'No se encontró ningún cliente.' : '🎉 No hay pagos pendientes por hoy.'}
          </li>
        )}
      </ul>

      <Button block className="mt-6" disabled={!g.shiftOpen} onClick={() => nav('/tienda')}>Venta en mostrador</Button>
      <PaySheet client={paying} onClose={() => setPaying(null)} />
    </Screen>
  )
}
