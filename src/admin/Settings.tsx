import { useState } from 'react'
import { useGym } from '../data/store'
import { PLANS } from '../lib/domain'
import { Card, Field, inputCls, ThemeSwitch } from '../components/ui'
import { RateForm } from '../components/Payment'
import { LogoMark, type LogoState } from '../components/Logo'
import { AdminHeader } from './AdminLayout'

/** Campo decimal: conserva lo que se escribe ("2.", "0.5") y guarda el número cuando es válido. */
function DecimalField({ label, value, onCommit }: { label: string; value: number; onCommit: (n: number) => void }) {
  const [text, setText] = useState(String(value))
  return (
    <Field label={label}>
      <input
        className={inputCls} inputMode="decimal" value={text}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.,]/g, '')
          setText(t)
          const n = Number(t.replace(',', '.'))
          if (t !== '' && Number.isFinite(n) && n >= 0) onCommit(n)
        }}
      />
    </Field>
  )
}

const LOGO_STATES: { id: LogoState | 'badge'; label: string; note: string }[] = [
  { id: 'default', label: 'Normal', note: 'Uso habitual' },
  { id: 'active', label: 'Activo', note: 'Seleccionado o éxito' },
  { id: 'inactive', label: 'Inactivo', note: 'Bloqueado o cerrado' },
  { id: 'loading', label: 'Cargando', note: 'Verificando' },
  { id: 'badge', label: 'Aviso', note: 'Pagos pendientes' },
]

export function SettingsPage() {
  const g = useGym()
  return (
    <>
      <AdminHeader eyebrow="Configuración" title="Ajustes" />
      <div className="grid max-w-3xl gap-4">
        <Card className="!p-6 space-y-4">
          <h2 className="font-bold">Tasa del USD de hoy</h2>
          <p className="text-sm text-muted">
            {g.rateFresh ? `Fijada hoy: 1 USD = ${g.settings.usdRate} MN.` : 'Todavía no se fijó hoy. Sin ella no se puede cobrar en MN ni con tarjeta.'}{' '}
            Los trabajadores también la pueden fijar desde Inicio.
          </p>
          <RateForm />
        </Card>
        <Card className="!p-6 space-y-4">
          <h2 className="font-bold">Gimnasio</h2>
          <Field label="Nombre del gimnasio"><input className={inputCls} value={g.settings.gymName} onChange={(e) => g.setSettings({ gymName: e.target.value })} /></Field>
          <Field label="Prefijo telefónico del país (sin +)"><input className={inputCls} inputMode="numeric" value={g.settings.countryCode} onChange={(e) => g.setSettings({ countryCode: e.target.value.replace(/\D/g, '') })} /></Field>
        </Card>
        <Card className="!p-6">
          <h2 className="mb-1 font-bold">Apariencia</h2>
          <p className="mb-4 text-sm text-muted">Automático sigue el modo claro u oscuro del teléfono. Se guarda en este dispositivo.</p>
          <ThemeSwitch />
        </Card>
        <Card className="!p-6">
          <h2 className="mb-1 font-bold">Logo y estados</h2>
          <p className="mb-5 text-sm text-muted">Así se ve el logo en cada situación de la app. El icono instalado en el teléfono lleva el número de pagos pendientes.</p>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {LOGO_STATES.map((s) => (
              <li key={s.id} className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-bg p-4 text-center">
                <LogoMark size={64} state={s.id === 'badge' ? 'default' : s.id} badge={s.id === 'badge' ? 3 : 0} label={s.label} />
                <span className="text-sm font-bold">{s.label}</span>
                <span className="text-xs text-muted">{s.note}</span>
              </li>
            ))}
          </ul>
          <div aria-label="Icono de la app" role="img" className="mt-5 grid size-24 place-items-center rounded-[22%] bg-gold p-[3.5%]">
            <div className="grid size-full place-items-center rounded-[19%] bg-[linear-gradient(160deg,#25272b,#121315)] shadow-[inset_0_0_14px_rgb(0_0_0/0.6)]">
              <LogoMark size={64} />
            </div>
          </div>
        </Card>
        <Card className="!p-6">
          <h2 className="mb-4 font-bold">Precio de los planes (USD)</h2>
          <div className="grid grid-cols-2 gap-4">
            {PLANS.map((p) => (
              <DecimalField key={p.id} label={`${p.label} (${p.days})`} value={g.settings.planPrices[p.id]}
                onCommit={(n) => g.setSettings({ planPrices: { ...g.settings.planPrices, [p.id]: n }, pricesReviewed: true })} />
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">Los precios están en USD. En MN y con tarjeta se calculan con la tasa del día. Los cambios aplican a los próximos cobros.</p>
        </Card>
      </div>
    </>
  )
}
