import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { chargeFor, normalizeCarnet, rateIsFresh, renewalDate, summarize } from '../lib/domain'
import type { Client, Method, Movement, PlanId, Product, Settings, Shift } from '../lib/types'
import { defaultSettings, newShift, seedClients, seedHistory, seedProducts, today } from './seed'

/**
 * Estado local persistido en localStorage. Todas las escrituras pasan por las
 * acciones de `useGym()`, así que migrar a Supabase solo exige reemplazar
 * este archivo manteniendo la misma API.
 */
interface State {
  settings: Settings
  clients: Client[]
  products: Product[]
  movements: Movement[]
  shifts: Shift[]
}

type Action =
  | { type: 'enroll'; client: Client; movement?: Movement }
  | { type: 'pay'; clientId: string; movement: Movement; nextDue: string }
  | { type: 'sell'; movement: Movement; items: { id: string; qty: number }[] }
  | { type: 'closeShift'; shiftId: string; countedMN: number; countedUSD: number; expectedMN: number; expectedUSD: number }
  | { type: 'openShift'; shift: Shift }
  | { type: 'addProduct'; product: Product }
  | { type: 'updateProduct'; id: string; patch: Partial<Product> }
  | { type: 'setSettings'; patch: Partial<Settings> }

const KEY = 'basto-gym:v4'

function initial(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as State
  } catch { /* almacenamiento no disponible */ }
  const h = seedHistory()
  return {
    settings: defaultSettings,
    clients: seedClients(),
    products: seedProducts,
    movements: h.movements,
    shifts: [newShift(defaultSettings.worker), ...h.shifts],
  }
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'enroll':
      return { ...s, clients: [a.client, ...s.clients], movements: a.movement ? [a.movement, ...s.movements] : s.movements }
    case 'pay':
      return {
        ...s,
        clients: s.clients.map((c) => (c.id === a.clientId ? { ...c, nextDue: a.nextDue } : c)),
        movements: [a.movement, ...s.movements],
      }
    case 'sell':
      return {
        ...s,
        products: s.products.map((p) => {
          const it = a.items.find((i) => i.id === p.id)
          return it ? { ...p, stock: Math.max(0, p.stock - it.qty) } : p
        }),
        movements: [a.movement, ...s.movements],
      }
    case 'closeShift':
      return {
        ...s,
        shifts: s.shifts.map((sh) =>
          sh.id === a.shiftId
            ? { ...sh, closedAt: new Date().toISOString(), countedMN: a.countedMN, countedUSD: a.countedUSD, expectedMN: a.expectedMN, expectedUSD: a.expectedUSD }
            : sh,
        ),
      }
    case 'openShift':
      return { ...s, shifts: [a.shift, ...s.shifts] }
    case 'addProduct':
      return { ...s, products: [a.product, ...s.products] }
    case 'updateProduct':
      return { ...s, products: s.products.map((p) => (p.id === a.id ? { ...p, ...a.patch } : p)) }
    case 'setSettings':
      return { ...s, settings: { ...s.settings, ...a.patch } }
  }
}

interface Api extends State {
  today: string
  shift: Shift // turno actual (abierto o recién cerrado)
  shiftOpen: boolean
  shiftMovements: Movement[]
  /** ¿La tasa USD es la de hoy? Sin ella no se puede cobrar en MN ni con tarjeta. */
  rateFresh: boolean
  setRate(rate: number): void
  /** Devuelve null si no se pudo cobrar (turno cerrado o tasa vencida). */
  enroll(input: { name: string; phone: string; carnet: string; plan: PlanId; method: Method }): Client | null
  pay(clientId: string, method: Method): boolean
  sell(items: { product: Product; qty: number }[], method: Method): boolean
  closeShift(counted: { mn: number; usd: number }): void
  openShift(): void
  addProduct(p: Omit<Product, 'id'> & { id?: string }): void
  updateProduct(id: string, patch: Partial<Product>): void
  setSettings(patch: Partial<Settings>): void
}

const Ctx = createContext<Api | null>(null)

export function GymProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initial)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* sin espacio o bloqueado */ }
  }, [state])

  const shift = state.shifts[0]
  const shiftOpen = !shift.closedAt
  const shiftMovements = useMemo(
    () => state.movements.filter((m) => m.shiftId === shift.id),
    [state.movements, shift.id],
  )

  const mkMovement = useCallback(
    (m: Omit<Movement, 'id' | 'shiftId' | 'at'>): Movement => ({
      ...m, id: crypto.randomUUID(), shiftId: shift.id, at: new Date().toISOString(),
    }),
    [shift.id],
  )

  const api: Api = {
    ...state,
    today: today(),
    shift,
    shiftOpen,
    shiftMovements,
    rateFresh: rateIsFresh(state.settings, today()),
    setRate(rate) {
      if (!Number.isFinite(rate) || rate <= 0) return
      dispatch({ type: 'setSettings', patch: { usdRate: rate, usdRateDate: today() } })
    },
    enroll({ name, phone, carnet, plan, method }) {
      const t = today()
      const price = state.settings.planPrices[plan]
      const ch = chargeFor(price, method, state.settings, t)
      if (!ch || !shiftOpen) return null
      const client: Client = {
        id: crypto.randomUUID(), name: name.trim(), phone: phone.trim(), carnet: normalizeCarnet(carnet),
        plan, startDate: t, nextDue: renewalDate(t, plan, t),
      }
      dispatch({
        type: 'enroll', client,
        movement: mkMovement({
          kind: 'mensualidad', label: `Inscripción · ${client.name}`,
          amount: price, method, paid: ch.paid, rate: ch.rate,
        }),
      })
      return client
    },
    pay(clientId, method) {
      const c = state.clients.find((x) => x.id === clientId)
      if (!c || !shiftOpen) return false
      const price = state.settings.planPrices[c.plan]
      const ch = chargeFor(price, method, state.settings, today())
      if (!ch) return false
      dispatch({
        type: 'pay', clientId,
        nextDue: renewalDate(c.nextDue, c.plan, today()),
        movement: mkMovement({
          kind: 'mensualidad', label: `Mensualidad · ${c.name}`,
          amount: price, method, paid: ch.paid, rate: ch.rate,
        }),
      })
      return true
    },
    sell(items, method) {
      if (!shiftOpen || items.length === 0) return false
      const total = Math.round(items.reduce((n, i) => n + i.product.price * i.qty, 0) * 100) / 100
      const ch = chargeFor(total, method, state.settings, today())
      if (!ch) return false
      const label = items.map((i) => (i.qty > 1 ? `${i.qty}× ` : '') + i.product.name).join(', ')
      dispatch({
        type: 'sell', items: items.map((i) => ({ id: i.product.id, qty: i.qty })),
        movement: mkMovement({ kind: 'venta', label: `Venta · ${label}`, amount: total, method, paid: ch.paid, rate: ch.rate }),
      })
      return true
    },
    closeShift(counted) {
      const { expected } = summarize(shiftMovements)
      dispatch({ type: 'closeShift', shiftId: shift.id, countedMN: counted.mn, countedUSD: counted.usd, expectedMN: expected.mn, expectedUSD: expected.usd })
    },
    openShift() {
      dispatch({ type: 'openShift', shift: newShift(state.settings.worker) })
    },
    addProduct: (p) => dispatch({ type: 'addProduct', product: { ...p, id: p.id ?? crypto.randomUUID() } }),
    updateProduct: (id, patch) => dispatch({ type: 'updateProduct', id, patch }),
    setSettings: (patch) => dispatch({ type: 'setSettings', patch }),
  }
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useGym(): Api {
  const v = useContext(Ctx)
  if (!v) throw new Error('useGym fuera de GymProvider')
  return v
}
