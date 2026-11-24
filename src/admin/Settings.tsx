import { useState } from 'react'
import { useGym } from '../data/store'
import { PLANS } from '../lib/domain'
import { Card, Field, inputCls } from '../components/ui'
import { RateForm } from '../components/Payment'
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
          <h2 className="mb-4 font-bold">Precio de los planes (USD)</h2>
          <div className="grid grid-cols-2 gap-4">
            {PLANS.map((p) => (
              <DecimalField key={p.id} label={`${p.label} (${p.days})`} value={g.settings.planPrices[p.id]}
                onCommit={(n) => g.setSettings({ planPrices: { ...g.settings.planPrices, [p.id]: n } })} />
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">Los precios están en USD. En MN y con tarjeta se calculan con la tasa del día. Los cambios aplican a los próximos cobros.</p>
        </Card>
      </div>
    </>
  )
}
