import { useGym } from '../data/store'
import { PLANS } from '../lib/domain'
import { Card, Field, inputCls } from '../components/ui'
import { AdminHeader } from './AdminLayout'

export function SettingsPage() {
  const g = useGym()
  return (
    <>
      <AdminHeader eyebrow="Configuración" title="Ajustes" />
      <div className="grid max-w-3xl gap-4">
        <Card className="!p-6 space-y-4">
          <h2 className="font-bold">Gimnasio</h2>
          <Field label="Nombre del gimnasio"><input className={inputCls} value={g.settings.gymName} onChange={(e) => g.setSettings({ gymName: e.target.value })} /></Field>
          <Field label="Prefijo telefónico del país (sin +)"><input className={inputCls} inputMode="numeric" value={g.settings.countryCode} onChange={(e) => g.setSettings({ countryCode: e.target.value.replace(/\D/g, '') })} /></Field>
        </Card>
        <Card className="!p-6">
          <h2 className="mb-4 font-bold">Precio de los planes</h2>
          <div className="grid grid-cols-2 gap-4">
            {PLANS.map((p) => (
              <Field key={p.id} label={`${p.label} (${p.days})`}>
                <input className={inputCls} inputMode="decimal" value={g.settings.planPrices[p.id]}
                  onChange={(e) => g.setSettings({ planPrices: { ...g.settings.planPrices, [p.id]: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 } })} />
              </Field>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">Los cambios aplican a los próximos cobros e inscripciones.</p>
        </Card>
      </div>
    </>
  )
}
