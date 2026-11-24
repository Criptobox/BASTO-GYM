import { useState, type FormEvent } from 'react'
import { useGym } from '../data/store'
import { isValidPin } from '../lib/pin'
import { Avatar, Button, Card, Field, inputCls, Pill, Sheet, useToast } from '../components/ui'
import type { Worker } from '../lib/types'
import { AdminHeader, td, th } from './AdminLayout'

const pinInput = (v: string, set: (s: string) => void, label: string) => (
  <input
    className={inputCls} type="password" inputMode="numeric" autoComplete="new-password" maxLength={6}
    aria-label={label} value={v} onChange={(e) => set(e.target.value.replace(/\D/g, ''))}
  />
)

export function Workers() {
  const g = useGym()
  const toast = useToast()
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [target, setTarget] = useState<Worker | null>(null)
  const [newPin, setNewPin] = useState('')
  const [pinTouched, setPinTouched] = useState(false)

  const taken = g.workers.some((w) => w.name.trim().toLowerCase() === name.trim().toLowerCase())
  const nameOk = name.trim().length >= 3 && !taken
  const ok = nameOk && isValidPin(pin)

  async function add(e: FormEvent) {
    e.preventDefault(); setTouched(true)
    if (!ok || busy) return
    setBusy(true)
    try { await g.addWorker({ name, pin }); toast(`${name.trim()} ya puede entrar`); setName(''); setPin(''); setTouched(false) }
    finally { setBusy(false) }
  }
  async function savePin() {
    setPinTouched(true)
    if (!target || !isValidPin(newPin) || busy) return
    setBusy(true)
    try { await g.setWorkerPin(target.id, newPin); toast(`Clave de ${target.name} actualizada`); setTarget(null); setNewPin(''); setPinTouched(false) }
    finally { setBusy(false) }
  }

  return (
    <>
      <AdminHeader eyebrow="Equipo" title="Trabajadores" />
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Cada trabajador entra con su propia clave. Todo cobro y cada cierre quedan a nombre de quien los hizo, para saber de quién es cada turno si hay un problema.
      </p>
      <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-x-auto rounded-3xl border border-line surface-card">
          <table className="rtable w-full md:min-w-[560px]">
            <thead><tr className="border-b border-line"><th className={th}>Nombre</th><th className={th}>Rol</th><th className={th}>Estado</th><th className={th}>Acciones</th></tr></thead>
            <tbody>
              {g.workers.map((w) => {
                const me = w.id === g.session?.id
                return (
                  <tr key={w.id} className="border-b border-line last:border-0">
                    <td data-label="Nombre" className={td}><div className="flex items-center gap-3"><Avatar name={w.name} size={36} /><span className="font-semibold">{w.name}{me ? ' (tú)' : ''}</span></div></td>
                    <td data-label="Rol" className={td}>{w.role === 'admin' ? 'Administrador' : 'Trabajador'}</td>
                    <td data-label="Estado" className={td}>
                      {!w.active ? <Pill tone="white">Desactivado</Pill> : !w.pinHash ? <Pill tone="amber">Sin clave</Pill> : <Pill>Activo</Pill>}
                    </td>
                    <td data-label="Acciones" className={td}>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setTarget(w); setNewPin(''); setPinTouched(false) }}>{w.pinHash ? 'Cambiar clave' : 'Dar clave'}</Button>
                        {!me && <Button size="sm" variant="outline" onClick={() => g.setWorkerActive(w.id, !w.active)}>{w.active ? 'Desactivar' : 'Activar'}</Button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <Card className="!p-5">
          <h2 className="mb-4 text-lg font-extrabold">Nuevo trabajador</h2>
          <form onSubmit={add} noValidate className="space-y-4">
            <Field label="Nombre" error={touched && !nameOk && (taken ? 'Ya existe alguien con ese nombre.' : 'Escribe el nombre.')}>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Clave (4 a 6 números)" error={touched && !isValidPin(pin) && 'Usa de 4 a 6 números.'}>
              {pinInput(pin, setPin, 'Clave del nuevo trabajador')}
            </Field>
            <Button type="submit" block disabled={busy}>Crear trabajador</Button>
          </form>
        </Card>
      </div>

      <Sheet open={!!target} onClose={() => setTarget(null)} title={target ? `Clave de ${target.name}` : 'Clave'}>
        <p className="mb-4 text-sm text-muted">Escribe la nueva clave (4 a 6 números). La anterior deja de servir y se levanta cualquier bloqueo por intentos.</p>
        <Field label="Nueva clave" error={pinTouched && !isValidPin(newPin) && 'Usa de 4 a 6 números.'}>
          {pinInput(newPin, setNewPin, 'Nueva clave')}
        </Field>
        <Button block className="mt-5" disabled={busy} onClick={() => void savePin()}>Guardar clave</Button>
      </Sheet>
    </>
  )
}
