import { useState } from 'react'
import { METHODS, dueInfo } from '../lib/domain'
import { formatDate } from '../lib/dates'
import { makeMoney } from '../lib/format'
import type { Client, Method } from '../lib/types'
import { useGym } from '../data/store'
import { Avatar, Button, Segmented, Sheet } from './ui'
import { renewalDate } from '../lib/domain'

export function PaySheet({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const g = useGym()
  const money = makeMoney(g.settings)
  const [method, setMethod] = useState<Method>('efectivo')
  if (!client) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>
  const amount = g.settings.planPrices[client.plan]
  const next = renewalDate(client.nextDue, client.plan, g.today)
  return (
    <Sheet open onClose={onClose} title="Registrar pago">
      <div className="mb-5 flex items-center gap-3">
        <Avatar name={client.name} photo={client.photo} />
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
      <Button block className="mt-6" onClick={() => { g.pay(client.id, method); onClose() }}>
        Confirmar cobro
      </Button>
    </Sheet>
  )
}
