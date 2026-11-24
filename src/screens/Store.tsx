import { useMemo, useState } from 'react'
import { Dumbbell, Minus, Plus, Search, ShoppingBag } from 'lucide-react'
import { useGym } from '../data/store'
import { toMN } from '../lib/domain'
import { MethodPicker, useCharge, useDefaultMethod } from '../components/Payment'
import { makeMoney } from '../lib/format'
import { Button, Card, cx, inputCls, Pill, Screen, Sheet, useToast } from '../components/ui'
import { haptic } from '../lib/nav'
import type { Method, Product } from '../lib/types'

const CATS = ['Todo', 'Proteínas', 'Bebidas', 'Ropa', 'Accesorios'] as const

export function Store() {
  const g = useGym()
  const money = makeMoney(g.settings)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<(typeof CATS)[number]>('Todo')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<Method>(useDefaultMethod())
  const toast = useToast()

  const products = useMemo(
    () => g.products.filter((p) => (cat === 'Todo' || p.category === cat) && `${p.name} ${p.variant}`.toLowerCase().includes(q.trim().toLowerCase())),
    [g.products, cat, q],
  )
  const lines = g.products.filter((p) => cart[p.id]).map((p) => ({ product: p, qty: cart[p.id] }))
  const count = lines.reduce((n, l) => n + l.qty, 0)
  const total = Math.round(lines.reduce((n, l) => n + l.product.price * l.qty, 0) * 100) / 100
  const { ch, label } = useCharge(total, method)

  const add = (p: Product, d: number) =>
    setCart((c) => {
      const qty = Math.min(p.stock, Math.max(0, (c[p.id] ?? 0) + d))
      const { [p.id]: _, ...rest } = c
      return qty ? { ...rest, [p.id]: qty } : rest
    })

  function confirm() {
    if (!g.sell(lines, method)) return
    haptic(); toast(`Venta registrada · ${label}`)
    setOpen(false)
    setTimeout(() => setCart({}), 320) // deja terminar la animación de cierre con el contenido visible
  }

  return (
    <Screen
      eyebrow="Suplementos y accesorios" title="Tienda"
      action={
        <button
          aria-label={`Carrito, ${count} productos`} onClick={() => setOpen(true)} disabled={!count}
          className="relative grid size-12 shrink-0 place-items-center rounded-2xl border border-amber text-amber disabled:opacity-40"
        >
          <ShoppingBag size={20} aria-hidden />
          {count > 0 && <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-amber text-[11px] font-extrabold text-amber-ink">{count}</span>}
        </button>
      }
    >
      <div className="relative">
        <Search size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto" aria-label="Buscar producto" className={`${inputCls} pl-11`} />
      </div>

      <div role="tablist" aria-label="Categorías" className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
        {CATS.map((c) => (
          <button
            key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)}
            className={cx('h-10 shrink-0 rounded-full border px-4 text-sm font-semibold', cat === c ? 'border-amber bg-amber text-amber-ink' : 'border-line text-white')}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3">
        {products.map((p) => {
          const inCart = cart[p.id] ?? 0
          const out = p.stock === 0
          return (
            <li key={p.id}>
              <Card className={cx('flex h-full flex-col !p-3', out && 'opacity-60')}>
                <div className="relative grid aspect-[4/3] place-items-center rounded-2xl bg-surface-2 text-amber">
                  {p.photo ? <img src={p.photo} alt={p.name} loading="lazy" className="size-full rounded-2xl object-cover" /> : <Dumbbell size={30} aria-hidden />}
                  {p.isNew && <span className="absolute left-2 top-2"><Pill tone="amber">Nuevo</Pill></span>}
                  {!out && p.stock <= 5 && <span className="absolute right-2 top-2"><Pill tone="white">Quedan {p.stock}</Pill></span>}
                </div>
                <p className="mt-2.5 text-[15px] font-bold leading-tight">{p.name}</p>
                <p className="text-sm text-muted">{p.variant}</p>
                <div className="mt-auto pt-3">
                  <span className="block text-lg font-extrabold">{money.usd(p.price)}</span>
                  {g.rateFresh && <span className="block text-xs text-muted">{money.mn(toMN(p.price, g.settings.usdRate))}</span>}
                  {out ? <div className="mt-2"><Pill tone="white">Agotado</Pill></div> : inCart ? (
                    <div className="mt-2 flex items-center justify-between">
                      <button aria-label={`Quitar uno de ${p.name}`} onClick={() => add(p, -1)} className="grid size-9 place-items-center rounded-full border border-amber text-amber"><Minus size={16} /></button>
                      <span className="w-4 text-center font-bold">{inCart}</span>
                      <button aria-label={`Agregar uno de ${p.name}`} onClick={() => add(p, 1)} disabled={inCart >= p.stock} className="grid size-9 place-items-center rounded-full bg-amber text-amber-ink disabled:opacity-40"><Plus size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => add(p, 1)} aria-label={`Agregar ${p.name}`} className="mt-2 h-10 w-full whitespace-nowrap rounded-full border border-amber text-sm font-bold text-amber active:scale-95">+ Agregar</button>
                  )}
                </div>
              </Card>
            </li>
          )
        })}
      </ul>
      {products.length === 0 && <p className="mt-8 text-center text-muted">Sin resultados.</p>}

      {/* Barra de carrito pegada sobre la navegación: nunca tapa contenido. */}
      <div className="h-20" />
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-[92px] z-30 mx-auto max-w-[430px] px-4">
          <Button block disabled={!g.shiftOpen} onClick={() => setOpen(true)}>Ver carrito ({count}) · {money.usd(total)}</Button>
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Carrito">
        <ul className="divide-y divide-line">
          {lines.map(({ product: p, qty }) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-sm text-muted">{money.usd(p.price)} c/u</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button aria-label={`Quitar uno de ${p.name}`} onClick={() => add(p, -1)} className="grid size-9 place-items-center rounded-full border border-line"><Minus size={16} /></button>
                <span className="w-5 text-center font-bold">{qty}</span>
                <button aria-label={`Agregar uno de ${p.name}`} onClick={() => add(p, 1)} disabled={qty >= p.stock} className="grid size-9 place-items-center rounded-full border border-line disabled:opacity-40"><Plus size={16} /></button>
              </div>
              <span className="w-20 text-right font-bold">{money.usd(p.price * qty)}</span>
            </li>
          ))}
        </ul>
        <div className="my-4 flex items-end justify-between border-t border-line pt-4">
          <span className="text-muted">Total</span>
          <span className="text-3xl font-extrabold tracking-tight">{money.usd(total)}</span>
        </div>
        <MethodPicker usd={total} method={method} onChange={setMethod} />
        <Button block className="mt-6" onClick={confirm} disabled={!lines.length || !ch}>{label ? `Cobrar ${label}` : 'Fija la tasa para cobrar'}</Button>
      </Sheet>
    </Screen>
  )
}
