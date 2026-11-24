import { useState } from 'react'
import { dueInfo, renewalDate } from '../lib/domain'
import { formatDate } from '../lib/dates'
import { makeMoney } from '../lib/format'
import type { Client, Method } from '../lib/types'
import { useGym } from '../data/store'
import { Avatar, Button, Sheet, useLatest, useToast } from './ui'
import { MethodPicker, useCharge, useDefaultMethod } from './Payment'
import { haptic } from '../lib/nav'

export function PaySheet({ client: current, onClose }: { client: Client | null; onClose: () => void }) {
  const g = useGym()
  const toast = useToast()
  const client = useLatest(current)
  const money = makeMoney(g.settings)
  const [method, setMethod] = useState<Method>(useDefaultMethod())
  const price = client ? g.settings.planPrices[client.plan] : 0
  const { ch, label } = useCharge(price, method)
  if (!client) return null
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
        <p className="text-sm font-medium">Precio del plan</p>
        <p className="text-4xl font-extrabold tracking-tight">{money.usd(price)}</p>
        <p className="mt-1 text-sm font-medium">Nuevo vencimiento: {formatDate(next, g.settings.locale)}</p>
      </div>
      <MethodPicker usd={price} method={method} onChange={setMethod} />
      <Button
        block className="mt-6" disabled={!ch}
        onClick={() => {
          if (!g.pay(client.id, method)) return
          haptic(); toast(`Cobro registrado · ${client.name.split(' ')[0]}`); onClose()
        }}
      >
        {label ? `Cobrar ${label}` : 'Fija la tasa para cobrar'}
      </Button>
    </Sheet>
  )
}
