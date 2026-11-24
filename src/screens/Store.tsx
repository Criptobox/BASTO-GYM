import { useMemo, useState } from 'react'
import { Dumbbell, Minus, Plus, Search, ShoppingBag } from 'lucide-react'
import { useGym } from '../data/store'
import { METHODS } from '../lib/domain'
import { makeMoney } from '../lib/format'
import { Button, Card, cx, inputCls, Pill, Screen, Segmented, Sheet } from '../components/ui'
import type { Method, Product } from '../lib/types'

const CATS = ['Todo', 'Proteínas', 'Bebidas', 'Ropa', 'Accesorios'] as const

export function Store() {
  const g = useGym()
  const money = makeMoney(g.settings)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<(typeof CATS)[number]>('Todo')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<Method>('efectivo')
  const [ok, setOk] = useState(false)

  const products = useMemo(
    () => g.products.filter((p) => (cat === 'Todo' || p.category === cat) && `${p.name} ${p.variant}`.toLowerCase().includes(q.trim().toLowerCase())),
    [g.products, cat, q],
  )
  const lines = g.products.filter((p) => cart[p.id]).map((p) => ({ product: p, qty: cart[p.id] }))
  const count = lines.reduce((n, l) => n + l.qty, 0)
  const total = lines.reduce((n, l) => n + l.product.price * l.qty, 0)

  const add = (p: Product, d: number) =>
    setCart((c) => {
      const qty = Math.min(p.stock, Math.max(0, (c[p.id] ?? 0) + d))
      const { [p.id]: _, ...rest } = c
      return qty ? { ...rest, [p.id]: qty } : rest
    })

  function confirm() {
    g.sell(lines, method)
    setCart({}); setOpen(false); setOk(true)
    setTimeout(() => setOk(false), 2500)
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
                  <span className="block text-lg font-extrabold">{money(p.price)}</span>
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
          <Button block disabled={!g.shiftOpen} onClick={() => setOpen(true)}>Ver carrito ({count}) · {money(total)}</Button>
        </div>
      )}
      {ok && <div role="status" className="fixed inset-x-0 bottom-[100px] z-50 mx-auto w-fit rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow-xl">✓ Venta registrada</div>}

      <Sheet open={open} onClose={() => setOpen(false)} title="Carrito">
        <ul className="divide-y divide-line">
          {lines.map(({ product: p, qty }) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-sm text-muted">{money(p.price)} c/u</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button aria-label={`Quitar uno de ${p.name}`} onClick={() => add(p, -1)} className="grid size-9 place-items-center rounded-full border border-line"><Minus size={16} /></button>
                <span className="w-5 text-center font-bold">{qty}</span>
                <button aria-label={`Agregar uno de ${p.name}`} onClick={() => add(p, 1)} disabled={qty >= p.stock} className="grid size-9 place-items-center rounded-full border border-line disabled:opacity-40"><Plus size={16} /></button>
              </div>
              <span className="w-20 text-right font-bold">{money(p.price * qty)}</span>
            </li>
          ))}
        </ul>
        <div className="my-4 flex items-end justify-between border-t border-line pt-4">
          <span className="text-muted">Total</span>
          <span className="text-3xl font-extrabold tracking-tight">{money(total)}</span>
        </div>
        <p className="mb-2 text-sm text-muted">Método de pago</p>
        <Segmented label="Método de pago" value={method} onChange={setMethod} options={METHODS} />
        <Button block className="mt-6" onClick={confirm} disabled={!lines.length}>Cobrar {money(total)}</Button>
      </Sheet>
    </Screen>
  )
}
