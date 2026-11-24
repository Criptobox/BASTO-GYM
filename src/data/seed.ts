import { addDays, toISODate } from '../lib/dates'
import type { Client, Movement, Product, Settings, Shift } from '../lib/types'

export const today = () => toISODate(new Date())

export const defaultSettings: Settings = {
  gymName: 'BASTO GYM',
  currency: 'MXN',
  locale: 'es-MX',
  countryCode: '52',
  // Precios de ejemplo: el administrador los podrá editar.
  planPrices: { dia: 50, semana: 200, mes: 600, anio: 5500 },
  worker: 'Daniela',
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
  { id: 'p1', name: 'Proteína Whey 2 lb', variant: 'Chocolate', category: 'Proteínas', price: 899, stock: 12, isNew: true },
  { id: 'p2', name: 'Creatina 300 g', variant: 'Sin sabor', category: 'Proteínas', price: 499, stock: 4 },
  { id: 'p3', name: 'Shaker 700 ml', variant: 'Negro', category: 'Accesorios', price: 149, stock: 30 },
  { id: 'p4', name: 'Bebida isotónica', variant: 'Limón', category: 'Bebidas', price: 35, stock: 0 },
  { id: 'p5', name: 'Agua 600 ml', variant: 'Natural', category: 'Bebidas', price: 20, stock: 48 },
  { id: 'p6', name: 'Playera BASTO', variant: 'Negra · M', category: 'Ropa', price: 299, stock: 9 },
  { id: 'p7', name: 'Guantes de gym', variant: 'Talla L', category: 'Accesorios', price: 249, stock: 6 },
]

export function newShift(worker: string): Shift {
  return { id: crypto.randomUUID(), worker, openedAt: new Date().toISOString() }
}

const at = (date: string, h: number, m = 0) => {
  const [y, mo, d] = date.split('-').map(Number)
  return new Date(y, mo - 1, d, h, m).toISOString()
}

/** Turnos cerrados de ejemplo para el historial del administrador. */
export function seedHistory(): { shifts: Shift[]; movements: Movement[] } {
  const t = today()
  const shifts: Shift[] = []
  const movements: Movement[] = []
  const spec: [number, number, number, string, number][] = [
    // díasAtrás, horaInicio, horaFin, trabajador, diferenciaEfectivo
    [1, 14, 21, 'Jorge', -100],
    [1, 8, 14, 'Daniela', 0],
    [2, 14, 21, 'Jorge', 50],
    [2, 8, 14, 'Daniela', 0],
    [4, 8, 14, 'Daniela', 0],
  ]
  spec.forEach(([ago, h0, h1, worker, delta], i) => {
    const date = addDays(t, -ago)
    const id = `h${i}`
    const mv = (n: number, kind: Movement['kind'], label: string, amount: number, method: Movement['method'], hh: number, mm: number) =>
      movements.push({ id: `${id}-${n}`, shiftId: id, kind, label, amount, method, at: at(date, hh, mm) })
    mv(1, 'mensualidad', 'Mensualidad · Cliente de ejemplo', 600, 'efectivo', h0 + 1, 10)
    mv(2, 'venta', 'Venta · Proteína Whey 2 lb', 899, 'tarjeta', h0 + 2, 30)
    mv(3, 'mensualidad', 'Mensualidad · Cliente de ejemplo', 600, 'transferencia', h0 + 3, 5)
    mv(4, 'venta', 'Venta · Agua 600 ml', 20, 'efectivo', h0 + 4, 45)
    const expected = 620
    shifts.push({
      id, worker, openedAt: at(date, h0), closedAt: at(date, h1),
      expectedCash: expected, countedCash: expected + delta,
    })
  })
  return { shifts, movements }
}
