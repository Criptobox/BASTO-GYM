import { useState, type FormEvent } from 'react'
import { Minus, Plus } from 'lucide-react'
import { useGym } from '../data/store'
import { makeMoney } from '../lib/format'
import { Button, Card, Field, inputCls, Pill } from '../components/ui'
import type { Product } from '../lib/types'
import { AdminHeader, Stat, td, th } from './AdminLayout'

const CATS: Product['category'][] = ['Proteínas', 'Bebidas', 'Ropa', 'Accesorios']

export function Products() {
  const g = useGym()
  const money = makeMoney(g.settings)
  const [f, setF] = useState({ name: '', variant: '', category: 'Proteínas' as Product['category'], price: '', stock: '' })
  const [touched, setTouched] = useState(false)
  const price = Number(f.price), stock = Number(f.stock)
  const valid = f.name.trim().length >= 2 && price > 0 && Number.isInteger(stock) && stock >= 0 && f.stock !== ''

  function submit(e: FormEvent) {
    e.preventDefault(); setTouched(true)
    if (!valid) return
    g.addProduct({ name: f.name.trim(), variant: f.variant.trim(), category: f.category, price, stock, isNew: true })
    setF({ ...f, name: '', variant: '', price: '', stock: '' }); setTouched(false)
  }
  const bad = (b: boolean, m: string) => touched && b && m

  return (
    <>
      <AdminHeader eyebrow="Catálogo" title="Productos" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Productos activos" value={g.products.filter((p) => p.stock > 0).length} />
        <Stat label="Con poco stock" value={g.products.filter((p) => p.stock > 0 && p.stock <= 5).length} tone="amber" />
        <Stat label="Agotados" value={g.products.filter((p) => p.stock === 0).length} tone="amber" />
      </div>
      <div className="mt-4 grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
          <table className="w-full min-w-[560px]">
            <thead><tr className="border-b border-line"><th className={th}>Producto</th><th className={th}>Precio</th><th className={th}>Stock</th><th className={th}>Estado</th></tr></thead>
            <tbody>
              {g.products.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className={td}><p className="font-semibold">{p.name}</p><p className="text-xs text-muted">{p.variant} · {p.category}</p></td>
                  <td className={td}>{money(p.price)}</td>
                  <td className={td}>
                    <div className="flex items-center gap-2">
                      <button aria-label={`Quitar una unidad de ${p.name}`} disabled={p.stock === 0} onClick={() => g.updateProduct(p.id, { stock: p.stock - 1 })} className="grid size-8 place-items-center rounded-full border border-line disabled:opacity-30"><Minus size={14} /></button>
                      <span className="w-8 text-center font-bold">{p.stock}</span>
                      <button aria-label={`Agregar una unidad de ${p.name}`} onClick={() => g.updateProduct(p.id, { stock: p.stock + 1 })} className="grid size-8 place-items-center rounded-full border border-line"><Plus size={14} /></button>
                    </div>
                  </td>
                  <td className={td}><Pill tone={p.stock === 0 ? 'white' : p.stock <= 5 ? 'amber' : 'muted'}>{p.stock === 0 ? 'Agotado' : p.stock <= 5 ? 'Poco stock' : 'Activo'}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Card className="!p-5">
          <h2 className="mb-4 text-lg font-extrabold">Nuevo producto</h2>
          <form onSubmit={submit} noValidate className="space-y-4">
            <Field label="Nombre" error={bad(f.name.trim().length < 2, 'Escribe el nombre.')}><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Variante (sabor, talla…)"><input className={inputCls} value={f.variant} onChange={(e) => setF({ ...f, variant: e.target.value })} /></Field>
            <Field label="Categoría">
              <select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Product['category'] })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Precio" error={bad(!(price > 0), 'Precio mayor a 0.')}><input className={inputCls} inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
              <Field label="Stock" error={bad(f.stock === '', 'Indica el stock.')}><input className={inputCls} inputMode="numeric" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value.replace(/\D/g, '') })} /></Field>
            </div>
            <Button type="submit" block>Publicar en la app</Button>
          </form>
        </Card>
      </div>
    </>
  )
}
