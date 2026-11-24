import { addDays, toISODate } from '../lib/dates'
import type { Client, Movement, Product, Settings, Shift, Worker } from '../lib/types'
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
  ]
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

export function newShift(w: Pick<Worker, 'id' | 'name'>): Shift {
  return { id: crypto.randomUUID(), worker: w.name, workerId: w.id, openedAt: new Date().toISOString() }
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
export function seedHistory(): { shifts: Shift[]; movements: Movement[] } {
  const t = today()
  const rate = 120
  const shifts: Shift[] = []
  const movements: Movement[] = []
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
    const mv = (n: number, kind: Movement['kind'], label: string, amount: number, method: Movement['method'], hh: number, mm: number) =>
      movements.push({
        id: `${id}-${n}`, shiftId: id, kind, label, amount, method,
        worker, workerId: worker === 'Daniela' ? 'w-daniela' : 'w-jorge',
        paid: method === 'usd' ? amount : Math.round(amount * rate),
        rate: method === 'usd' ? undefined : rate,
        at: at(date, hh, mm),
      })
    mv(1, 'mensualidad', 'Mensualidad · Cliente de ejemplo', 20, 'mn', h0 + 1, 10)
    mv(2, 'venta', 'Venta · Proteína Whey 2 lb', 25, 'tarjeta', h0 + 2, 30)
    mv(3, 'mensualidad', 'Mensualidad · Cliente de ejemplo', 20, 'usd', h0 + 3, 5)
    mv(4, 'venta', 'Venta · Agua 600 ml', 0.5, 'mn', h0 + 4, 45)
    const expectedMN = Math.round(20 * rate) + Math.round(0.5 * rate)
    const expectedUSD = 20
    shifts.push({
      id, worker, workerId: worker === 'Daniela' ? 'w-daniela' : 'w-jorge', openedAt: at(date, h0), closedAt: at(date, h1), closedBy: worker,
      expectedMN, expectedUSD, countedMN: expectedMN + dMN, countedUSD: expectedUSD + dUSD,
    })
  })
  return { shifts, movements }
}
