import { addDays, toISODate } from '../lib/dates'
import type { Client, Product, Settings, Shift } from '../lib/types'

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
  const mk = (id: string, name: string, phone: string, nextDue: string, plan: Client['plan'] = 'mes'): Client => ({
    id, name, phone, email: '', plan, startDate: addDays(nextDue, -30), nextDue,
  })
  return [
    mk('c1', 'Carlos Ramírez', '55 1111 2222', addDays(t, -5)),
    mk('c2', 'Ana García', '55 3333 4444', addDays(t, -2)),
    mk('c3', 'Luis Martínez', '55 5555 6666', t),
    mk('c4', 'Sofía Pérez', '55 7777 8888', addDays(t, 26)),
    mk('c5', 'Jorge Hernández', '55 9999 0000', addDays(t, 12), 'anio'),
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
