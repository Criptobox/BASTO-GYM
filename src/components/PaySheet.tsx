import { useEffect } from 'react'
import { dueInfo, renewalDate } from '../lib/domain'
import { formatDate } from '../lib/dates'
import { makeMoney } from '../lib/format'
import type { Client } from '../lib/types'
import { useGym } from '../data/store'
import { Avatar, Button, Sheet, useLatest, useToast, Glow } from './ui'
import { PaymentSplit, usePaymentSplit } from './Payment'
import { useReceipt } from './Receipt'
import { haptic } from '../lib/nav'

export function PaySheet({ client: current, onClose }: { client: Client | null; onClose: () => void }) {
  const g = useGym()
  const toast = useToast()
  const showReceipt = useReceipt()
  const client = useLatest(current)
  const money = makeMoney(g.settings)
  const price = client ? g.settings.planPrices[client.plan] : 0
  const split = usePaymentSplit(price)
  useEffect(() => split.reset(), [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!client) return null
  const next = renewalDate(client.nextDue, client.plan, g.today)
  return (
    <Sheet open={!!current} onClose={onClose} title="Registrar pago">
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={client.name} />
        <div>
          <p className="font-bold">{client.name}</p>
          <p className="text-sm text-muted">{dueInfo(client.nextDue, g.today).text}</p>
        </div>
      </div>
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-amber/50 surface-card p-4">
        <Glow />
        <p className="text-sm font-medium text-muted">Precio del plan</p>
        <p className="text-4xl font-extrabold tracking-tight text-gold">{money.usd(price)}</p>
        <p className="mt-1 text-sm font-medium text-muted">Nuevo vencimiento: <b className="text-ink">{formatDate(next, g.settings.locale)}</b></p>
      </div>
      <PaymentSplit split={split} totalUsd={price} />
      <Button
        block className="mt-5" disabled={!split.ready}
        onClick={() => {
          const mv = g.pay(client.id, split.inputs, split.change)
          if (!mv) return
          haptic(); toast(`Cobro registrado · ${client.name.split(' ')[0]}`, { label: 'Recibo', onClick: () => showReceipt(mv) }); split.reset(); onClose()
        }}
      >
        Cobrar {money.usd(price)}
      </Button>
    </Sheet>
  )
}
