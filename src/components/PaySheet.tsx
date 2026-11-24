import { useState } from 'react'
import { METHODS, dueInfo } from '../lib/domain'
import { formatDate } from '../lib/dates'
import { makeMoney } from '../lib/format'
import type { Client, Method } from '../lib/types'
import { useGym } from '../data/store'
import { Avatar, Button, Segmented, Sheet, useLatest, useToast } from './ui'
import { haptic } from '../lib/nav'
import { renewalDate } from '../lib/domain'

export function PaySheet({ client: current, onClose }: { client: Client | null; onClose: () => void }) {
  const g = useGym()
  const toast = useToast()
  const client = useLatest(current)
  const money = makeMoney(g.settings)
  const [method, setMethod] = useState<Method>('efectivo')
  if (!client) return null
  const amount = g.settings.planPrices[client.plan]
  const next = renewalDate(client.nextDue, client.plan, g.today)
  return (
    <Sheet open={!!current} onClose={onClose} title="Registrar pago">
      <div className="mb-5 flex items-center gap-3">
        <Avatar name={client.name} />
        <div>
          <p className="font-bold">{client.name}</p>
          <p className="text-sm text-muted">{dueInfo(client.nextDue, g.today).text}</p>
        </div>
      </div>
      <div className="mb-5 rounded-2xl bg-amber p-4 text-amber-ink">
        <p className="text-sm font-medium">Total a cobrar</p>
        <p className="text-4xl font-extrabold tracking-tight">{money(amount)}</p>
        <p className="mt-1 text-sm font-medium">Nuevo vencimiento: {formatDate(next, g.settings.locale)}</p>
      </div>
      <p className="mb-2 text-sm text-muted">Método de pago</p>
      <Segmented label="Método de pago" value={method} onChange={setMethod} options={METHODS} />
      <Button block className="mt-6" onClick={() => { g.pay(client.id, method); haptic(); toast(`Cobro registrado · ${client.name.split(' ')[0]}`); onClose() }}>
        Confirmar cobro
      </Button>
    </Sheet>
  )
}
