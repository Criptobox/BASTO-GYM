import { addDays, toISODate } from '../lib/dates'
import type { AlertLog, CashOut, Client, Movement, PaymentPart, Product, Settings, Shift, Worker } from '../lib/types'
import { summarize } from '../lib/domain'
import { DEMO, demoWorkers } from './demo'

export const today = () => toISODate(new Date())

export const defaultSettings: Settings = {
  gymName: 'BASTO GYM',
  locale: 'es-CU',
  countryCode: '53',
  // Precios en USD, de ejemplo: el administrador los puede editar en Ajustes.
  planPrices: { dia: 2, semana: 8, mes: 20, anio: 200 },
  // Tasa de ejemplo fijada hoy; en uso real se actualiza cada día.
  usdRate: 120,
  usdRateDate: today(),
}

export function seedClients(): Client[] {
  const t = today()
  const mk = (id: string, name: string, phone: string, carnet: string, nextDue: string, plan: Client['plan'] = 'mes'): Client => ({
    id, name, phone, carnet, plan, startDate: addDays(nextDue, -30), nextDue,
  })
  return [
    mk('c1', 'Carlos Ramírez', '55 1111 2222', '90010112345', addDays(t, -5)),
    mk('c2', 'Ana García', '55 3333 4444', '92051223456', addDays(t, -2)),
    mk('c3', 'Luis Martínez', '55 5555 6666', '88123034567', t),
    mk('c4', 'Sofía Pérez', '55 7777 8888', '95032145678', addDays(t, 26)),
    mk('c5', 'Jorge Hernández', '55 9999 0000', '85070756789', addDays(t, 12), 'anio'),
    ...(DEMO ? demoCrowd(t, mk) : []),
  ]
}

/** Solo en la demo: 30 clientes más, con vencimientos repartidos, para ver la app con el gimnasio lleno. */
function demoCrowd(t: string, mk: (id: string, name: string, phone: string, carnet: string, nextDue: string, plan?: Client['plan']) => Client): Client[] {
  const names = [
    'María Fernández', 'José Rodríguez', 'Yanet Castillo', 'Alejandro Díaz', 'Liset Moreno', 'Raúl Herrera',
    'Dayana Suárez', 'Osmany Pérez', 'Yamilé Torres', 'Ernesto Rivero', 'Claudia Ramos', 'Yoandri Gómez',
    'Lázaro Valdés', 'Marisleydis Cruz', 'Reinier Fuentes', 'Yudith Álvarez', 'Frank Morales', 'Leidy Hidalgo',
    'Adrián Cabrera', 'Arianna Soto', 'Dariel Medina', 'Niurka Delgado', 'Yasmany León', 'Rosa Benítez',
    'Pedro Ortiz', 'Laura Quintana', 'Michel Sánchez', 'Elena Vázquez', 'Ronald Peña', 'Daylin Rojas',
  ]
  // Repartidos entre vencidos (de 1 a 45 días), hoy, próximos y al día.
  const offsets = [-45, -32, -20, -14, -9, -6, -4, -3, -1, 0, 0, 1, 2, 3, 3, 5, 8, 10, 12, 15, 17, 19, 21, 23, 25, 26, 27, 28, 29, 30]
  return names.map((n, i) => mk(`d${i + 1}`, n, `5${String(2000000 + i * 7919).slice(0, 7)}`, String(80000000000 + i * 1234567).slice(0, 11), addDays(t, offsets[i]), i % 9 === 0 ? 'semana' : i % 13 === 0 ? 'anio' : 'mes'))
}

export const seedProducts: Product[] = [
  { id: 'p1', name: 'Proteína Whey 2 lb', variant: 'Chocolate', category: 'Proteínas', price: 25, stock: 12, isNew: true },
  { id: 'p2', name: 'Creatina 300 g', variant: 'Sin sabor', category: 'Proteínas', price: 14, stock: 4 },
  { id: 'p3', name: 'Shaker 700 ml', variant: 'Negro', category: 'Accesorios', price: 4, stock: 30 },
  { id: 'p4', name: 'Bebida isotónica', variant: 'Limón', category: 'Bebidas', price: 1, stock: 0 },
  { id: 'p5', name: 'Agua 600 ml', variant: 'Natural', category: 'Bebidas', price: 0.5, stock: 48 },
  { id: 'p6', name: 'Playera BASTO', variant: 'Negra · M', category: 'Ropa', price: 8, stock: 9 },
  { id: 'p7', name: 'Guantes de gym', variant: 'Talla L', category: 'Accesorios', price: 7, stock: 6 },
]

export function newShift(w: Pick<Worker, 'id' | 'name'>, opening = { mn: 0, usd: 0 }): Shift {
  return { id: crypto.randomUUID(), worker: w.name, workerId: w.id, openedAt: new Date().toISOString(), openingMN: opening.mn, openingUSD: opening.usd }
}

/** Trabajadores de ejemplo, sin clave: el administrador se la asigna en Trabajadores. */
export const seedWorkers = (): Worker[] => DEMO ? demoWorkers() : [
  { id: 'w-daniela', name: 'Daniela', role: 'worker', active: true, salt: '', pinHash: null },
  { id: 'w-jorge', name: 'Jorge', role: 'worker', active: true, salt: '', pinHash: null },
]

const at = (date: string, h: number, m = 0) => {
  const [y, mo, d] = date.split('-').map(Number)
  return new Date(y, mo - 1, d, h, m).toISOString()
}

/** Turnos cerrados de ejemplo para el historial del administrador. */
/** Avisos de ejemplo: Carlos fue avisado ayer y anteayer; Ana, hace un rato. */
export function seedAlerts(): AlertLog[] {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString()
  const h = 3_600_000
  return [
    { id: 'al-3', clientId: 'c2', at: ago(0.75 * h), state: 'vencido', worker: 'Daniela', workerId: 'w-daniela' },
    { id: 'al-2', clientId: 'c1', at: ago(26 * h), state: 'vencido', worker: 'Jorge', workerId: 'w-jorge' },
    { id: 'al-1', clientId: 'c1', at: ago(50 * h), state: 'vencido', worker: 'Daniela', workerId: 'w-daniela' },
  ]
}

const SEED_NAMES = ['Carlos Ramírez', 'Ana García', 'Luis Martínez', 'Sofía Pérez', 'Jorge Hernández']

export function seedHistory(): { shifts: Shift[]; movements: Movement[]; cashOuts: CashOut[] } {
  const t = today()
  const rate = 120
  const shifts: Shift[] = []
  const movements: Movement[] = []
  const cashOuts: CashOut[] = []
  // díasAtrás, horaInicio, horaFin, trabajador, diferenciaMN, diferenciaUSD
  const spec: [number, number, number, string, number, number][] = [
    [1, 14, 21, 'Jorge', -100, 0],
    [1, 8, 14, 'Daniela', 0, 0],
    [2, 14, 21, 'Jorge', 0, 1],
    [2, 8, 14, 'Daniela', 0, 0],
    [4, 8, 14, 'Daniela', 0, 0],
  ]
  spec.forEach(([ago, h0, h1, worker, dMN, dUSD], i) => {
    const date = addDays(t, -ago)
    const id = `h${i}`
    const wid = worker === 'Daniela' ? 'w-daniela' : 'w-jorge'
    const opening = { mn: 2000, usd: 20 }
    const part = (method: PaymentPart['method'], usd: number): PaymentPart =>
      method === 'usd' ? { method, paid: usd, usd } : { method, paid: Math.round(usd * rate), rate, usd }
    // "mixto": mitad en USD y el resto en MN
    const mv = (
      n: number, kind: Movement['kind'], label: string, amount: number, how: PaymentPart['method'] | 'mixto', hh: number, mm: number,
      extra: Partial<Movement> = {},
    ) =>
      movements.push({
        id: `${id}-${n}`, shiftId: id, kind, label, amount, worker, workerId: wid, at: at(date, hh, mm),
        parts: how === 'mixto' ? [part('usd', amount / 2), part('mn', amount / 2)] : [part(how, amount)],
        ...extra,
      })
    const c1 = i % 5, c2 = (i + 2) % 5
    mv(1, 'mensualidad', `Mensualidad · ${SEED_NAMES[c1]}`, 20, 'mn', h0 + 1, 10, { clientId: `c${c1 + 1}` })
    mv(2, 'venta', 'Venta · Proteína Whey 2 lb', 25, 'tarjeta', h0 + 2, 30)
    mv(3, 'mensualidad', `Mensualidad · ${SEED_NAMES[c2]}`, 20, i % 2 ? 'mixto' : 'usd', h0 + 3, 5, { clientId: `c${c2 + 1}` })
    // un cobro con vuelto: paga 1 USD por un agua de 0.5 USD y recibe 60 MN de vuelto
    mv(4, 'venta', 'Venta · Agua 600 ml', 0.5, i === 2 ? 'usd' : 'mn', h0 + 4, 45,
      i === 2 ? { parts: [{ method: 'usd', paid: 1, usd: 1 }], change: { method: 'mn', paid: 60, rate, usd: 0.5 } } : {})
    if (i === 1) cashOuts.push({ id: `${id}-o1`, shiftId: id, kind: 'gasto', concept: 'Agua y limpieza del local', mn: 300, usd: 0, at: at(date, h0 + 2, 0), worker, workerId: wid })
    if (i === 3) cashOuts.push({ id: `${id}-o1`, shiftId: id, kind: 'retiro', concept: 'Retiro del administrador', mn: 0, usd: 10, at: at(date, h0 + 5, 0), worker, workerId: wid })
    const outs = cashOuts.filter((o) => o.shiftId === id)
    const { expected } = summarize(movements.filter((m) => m.shiftId === id), { opening, outs })
    shifts.push({
      id, worker, workerId: wid, openedAt: at(date, h0), closedAt: at(date, h1), closedBy: worker,
      openingMN: opening.mn, openingUSD: opening.usd,
      expectedMN: expected.mn, expectedUSD: expected.usd, countedMN: expected.mn + dMN, countedUSD: expected.usd + dUSD,
    })
  })
  return { shifts, movements, cashOuts }
}
