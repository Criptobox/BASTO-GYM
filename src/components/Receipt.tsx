import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Copy, MessageCircle } from 'lucide-react'
import { useGym } from '../data/store'
import { receiptText } from '../lib/receipt'
import { whatsappLink } from '../lib/domain'
import type { Movement } from '../lib/types'
import { Button, Sheet, useLatest, useToast } from './ui'

const Ctx = createContext<(m: Movement) => void>(() => {})
/** Abre el recibo de un cobro (desde el aviso de "Cobro registrado" o desde el historial del cliente). */
export const useReceipt = () => useContext(Ctx)

export function ReceiptProvider({ children }: { children: ReactNode }) {
  const [m, setM] = useState<Movement | null>(null)
  const show = useCallback((mv: Movement) => setM(mv), [])
  return (
    <Ctx.Provider value={show}>
      {children}
      <ReceiptSheet movement={m} onClose={() => setM(null)} />
    </Ctx.Provider>
  )
}

function ReceiptSheet({ movement, onClose }: { movement: Movement | null; onClose: () => void }) {
  const g = useGym()
  const toast = useToast()
  const m = useLatest(movement)
  if (!m) return null
  const client = m.clientId ? g.clients.find((c) => c.id === m.clientId) : undefined
  const text = receiptText(m, { settings: g.settings, clientName: client?.name, nextDue: m.kind === 'mensualidad' ? client?.nextDue : undefined })
  // Con cliente va directo a su teléfono; en ventas se elige el contacto en WhatsApp.
  const href = client
    ? whatsappLink(client.phone, g.settings.countryCode, text)
    : `https://wa.me/?text=${encodeURIComponent(text)}`

  async function copy() {
    try { await navigator.clipboard.writeText(text); toast('Recibo copiado') }
    catch { toast('No se pudo copiar: selecciona el texto') }
  }
  return (
    <Sheet open={!!movement} onClose={onClose} title="Recibo">
      <pre className="mb-4 max-h-[42dvh] overflow-auto whitespace-pre-wrap rounded-2xl border border-line bg-field p-4 font-sans text-sm leading-relaxed text-ink select-text">{text}</pre>
      <a
        href={href} target="_blank" rel="noreferrer"
        className="bg-gold inline-flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-bold text-amber-ink active:scale-[0.97]"
      >
        <MessageCircle size={18} aria-hidden /> {client ? `Enviar a ${client.name.split(' ')[0]} por WhatsApp` : 'Enviar por WhatsApp'}
      </a>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => void copy()}><Copy size={16} aria-hidden /> Copiar</Button>
        <Button variant="outline" onClick={onClose}>Listo</Button>
      </div>
    </Sheet>
  )
}
