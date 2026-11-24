import { useRef, useState, type FormEvent } from 'react'
import { Camera, Dumbbell, Minus, PackagePlus, Plus } from 'lucide-react'
import { useGym } from '../data/store'
import { deleteProductPhoto, remoteMedia, uploadProductPhoto } from '../data/media'
import { blobToDataURL, kb, PRODUCT_PHOTO, toWebP } from '../lib/image'
import { makeMoney } from '../lib/format'
import { Button, Card, Field, IconTitle, Pill, inputCls } from '../components/ui'
import type { Product } from '../lib/types'
import { AdminHeader, Stat, StatGrid, td, th } from './AdminLayout'
import { useWide } from '../lib/media'

const CATS: Product['category'][] = ['Proteínas', 'Bebidas', 'Ropa', 'Accesorios']

interface Pending { blob: Blob; preview: string; before: number }

async function prepare(file: File): Promise<Pending> {
  const blob = await toWebP(file, PRODUCT_PHOTO)
  return { blob, preview: await blobToDataURL(blob), before: file.size }
}

export function Products() {
  const g = useGym()
  const wide = useWide()
  const money = makeMoney(g.settings)
  const [f, setF] = useState({ name: '', variant: '', category: 'Proteínas' as Product['category'], price: '', stock: '' })
  const [pending, setPending] = useState<Pending | null>(null)
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const price = Number(f.price), stock = Number(f.stock)
  const valid = f.name.trim().length >= 2 && price > 0 && Number.isInteger(stock) && stock >= 0 && f.stock !== ''

  async function pick(file?: File) {
    if (!file) return
    setError(''); setBusy(true)
    try { setPending(await prepare(file)) } catch { setError('No se pudo leer esa imagen. Prueba con otra foto.') }
    finally { setBusy(false) }
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); setTouched(true)
    if (!valid || busy) return
    setError(''); setBusy(true)
    try {
      const id = crypto.randomUUID()
      const photo = pending ? await uploadProductPhoto(pending.blob, id) : undefined
      g.addProduct({ id, name: f.name.trim(), variant: f.variant.trim(), category: f.category, price, stock, isNew: true, photo })
      setF({ ...f, name: '', variant: '', price: '', stock: '' }); setPending(null); setTouched(false)
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo subir la foto.') }
    finally { setBusy(false) }
  }

  async function changePhoto(p: Product, file?: File) {
    if (!file) return
    setError(''); setBusy(true)
    try {
      const { blob } = await prepare(file)
      const url = await uploadProductPhoto(blob, p.id)
      const old = p.photo
      g.updateProduct(p.id, { photo: url })
      await deleteProductPhoto(old).catch(() => {}) // la foto vieja sobrante no debe romper el cambio
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cambiar la foto.') }
    finally { setBusy(false) }
  }

  const bad = (b: boolean, m: string) => touched && b && m
  const thumb = (p: Product, size = 'size-12') => (
    <label className={`group relative grid ${size} shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl bg-surface-2 text-amber focus-within:outline focus-within:outline-2 focus-within:outline-amber`}>
      {p.photo ? <img src={p.photo} alt="" className="size-full object-cover" /> : <Dumbbell size={20} aria-hidden />}
      <span className="absolute inset-0 grid place-items-center bg-black/60 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"><Camera size={16} aria-hidden /></span>
      <input type="file" accept="image/*" className="sr-only" aria-label={`Cambiar foto de ${p.name}`} disabled={busy}
        onChange={(e) => { void changePhoto(p, e.target.files?.[0]); e.target.value = '' }} />
    </label>
  )
  const stepper = (p: Product, small = false) => (
    <div className="flex items-center gap-2">
      <button aria-label={`Quitar una unidad de ${p.name}`} disabled={p.stock === 0} onClick={() => g.updateProduct(p.id, { stock: p.stock - 1 })} className={`grid ${small ? 'size-9' : 'size-8'} place-items-center rounded-full border border-line disabled:opacity-30`}><Minus size={14} /></button>
      <span className="w-8 text-center font-bold">{p.stock}</span>
      <button aria-label={`Agregar una unidad de ${p.name}`} onClick={() => g.updateProduct(p.id, { stock: p.stock + 1 })} className={`grid ${small ? 'size-9' : 'size-8'} place-items-center rounded-full border border-line`}><Plus size={14} /></button>
    </div>
  )
  const estado = (p: Product) => <Pill tone={p.stock === 0 ? 'danger' : p.stock <= 5 ? 'amber' : 'muted'}>{p.stock === 0 ? 'Agotado' : p.stock <= 5 ? 'Poco stock' : 'Activo'}</Pill>


  return (
    <>
      <AdminHeader eyebrow="Catálogo" title="Productos" />
      <StatGrid>
        <Stat label="Productos activos" value={g.products.filter((p) => p.stock > 0).length} />
        <Stat label="Con poco stock" value={g.products.filter((p) => p.stock > 0 && p.stock <= 5).length} tone="amber" />
        <Stat label="Agotados" value={g.products.filter((p) => p.stock === 0).length} tone="amber" />
      </StatGrid>
      {error && <p role="alert" className="mt-4 rounded-2xl border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      <div className="mt-4 grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
        {!wide ? (
          <ul className="space-y-2">
            {g.products.map((p) => (
              <li key={p.id}>
                <Card className="!rounded-2xl !p-3">
                  <div className="flex items-center gap-3">
                    {thumb(p, 'size-11')}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold leading-tight">{p.name}</p>
                      <p className="truncate text-xs text-muted">{p.variant} · {p.category}</p>
                    </div>
                    <p className="font-extrabold text-gold">{money.usd(p.price)}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between pl-14">
                    {estado(p)}
                    {stepper(p, true)}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
        <div className="overflow-x-auto rounded-3xl border border-line surface-card">
          <table className="w-full min-w-[560px]">
            <thead><tr className="border-b border-line"><th className={th}>Producto</th><th className={th}>Precio (USD)</th><th className={th}>Stock</th><th className={th}>Estado</th></tr></thead>
            <tbody>
              {g.products.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      {thumb(p)}
                      <div className="min-w-0"><p className="font-semibold">{p.name}</p><p className="text-xs text-muted">{p.variant} · {p.category}</p></div>
                    </div>
                  </td>
                  <td className={`${td} font-bold text-amber`}>{money.usd(p.price)}</td>
                  <td className={td}>
                    {stepper(p)}
                  </td>
                  <td className={td}>{estado(p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        <Card className="!p-5">
          <IconTitle icon={<PackagePlus size={17} />} className="mb-4 text-lg">Nuevo producto</IconTitle>
          <form onSubmit={submit} noValidate className="space-y-4">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
              className="relative grid h-32 w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-amber text-amber disabled:opacity-60">
              {pending ? <img src={pending.preview} alt="Vista previa" className="size-full object-cover" /> : <span className="font-bold">{busy ? 'Procesando…' : 'Subir foto'}</span>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="Foto del producto" tabIndex={-1}
              onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
            {pending && (
              <p className="-mt-2 text-xs text-muted" aria-live="polite">
                Convertida a WebP: {kb(pending.blob.size)} (original {kb(pending.before)}). El original no se guarda.
                {!remoteMedia && ' · Modo local: la foto no se sube a GitHub.'}
              </p>
            )}
            <Field label="Nombre" error={bad(f.name.trim().length < 2, 'Escribe el nombre.')}><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Variante (sabor, talla…)"><input className={inputCls} value={f.variant} onChange={(e) => setF({ ...f, variant: e.target.value })} /></Field>
            <Field label="Categoría">
              <select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Product['category'] })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Precio (USD)" error={bad(!(price > 0), 'Precio mayor a 0.')}><input className={inputCls} inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
              <Field label="Stock" error={bad(f.stock === '', 'Indica el stock.')}><input className={inputCls} inputMode="numeric" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value.replace(/\D/g, '') })} /></Field>
            </div>
            <Button type="submit" block disabled={busy}>{busy ? 'Publicando…' : 'Publicar en la app'}</Button>
          </form>
        </Card>
      </div>
    </>
  )
}
