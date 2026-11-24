import { describe, expect, it } from 'vitest'
import { addMonths, addPlan } from './dates'
import { cashDifference, chargeFor, dueInfo, findByCarnet, isValidCarnet, normalizeCarnet, pendingClients, rateIsFresh, renewalDate, shiftDifference, summarize, whatsappLink } from './domain'
import type { Client, Movement } from './types'

describe('fechas', () => {
  it('no desborda meses cortos', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
  })
  it('suma planes', () => {
    expect(addPlan('2026-11-23', 'mes')).toBe('2026-12-23')
    expect(addPlan('2026-11-23', 'semana')).toBe('2026-11-30')
    expect(addPlan('2026-11-23', 'anio')).toBe('2027-11-23')
    expect(addPlan('2026-12-31', 'dia')).toBe('2027-01-01')
  })
})

describe('vencimientos', () => {
  const today = '2026-11-23'
  it('clasifica estados', () => {
    expect(dueInfo('2026-11-18', today)).toMatchObject({ state: 'vencido', text: 'Venció hace 5 días' })
    expect(dueInfo('2026-11-22', today).text).toBe('Venció hace 1 día')
    expect(dueInfo(today, today).state).toBe('hoy')
    expect(dueInfo('2026-11-25', today).state).toBe('pronto')
    expect(dueInfo('2026-12-23', today).state).toBe('aldia')
  })
  it('renueva desde hoy si ya venció y desde el vencimiento si paga antes', () => {
    expect(renewalDate('2026-11-18', 'mes', today)).toBe('2026-12-23')
    expect(renewalDate('2026-11-28', 'mes', today)).toBe('2026-12-28')
    expect(renewalDate(today, 'mes', today)).toBe('2026-12-23')
  })
  it('ordena pendientes por atraso', () => {
    const mk = (id: string, nextDue: string) => ({ id, nextDue }) as Client
    const r = pendingClients([mk('a', '2026-11-23'), mk('b', '2026-11-18'), mk('c', '2026-12-01')], today)
    expect(r.map((c) => c.id)).toEqual(['b', 'a'])
  })
})

describe('monedas', () => {
  const s = { usdRate: 120, usdRateDate: '2026-11-24' }
  const today = '2026-11-24'
  it('USD se cobra tal cual, sin necesitar tasa', () => {
    expect(chargeFor(25, 'usd', { usdRate: 0, usdRateDate: '' }, today)).toEqual({ paid: 25, currency: 'USD' })
  })
  it('MN y tarjeta se cobran a la tasa del día, a pesos enteros', () => {
    expect(chargeFor(25, 'mn', s, today)).toEqual({ paid: 3000, currency: 'MN', rate: 120 })
    expect(chargeFor(20, 'tarjeta', { usdRate: 122.5, usdRateDate: today }, today)).toEqual({ paid: 2450, currency: 'MN', rate: 122.5 })
    expect(chargeFor(0.5, 'mn', { usdRate: 123, usdRateDate: today }, today)?.paid).toBe(62) // 61.5 → 62
  })
  it('nunca cobra en MN con una tasa de otro día o inválida', () => {
    expect(chargeFor(25, 'mn', s, '2026-11-25')).toBeNull()
    expect(chargeFor(25, 'tarjeta', { usdRate: 0, usdRateDate: today }, today)).toBeNull()
    expect(chargeFor(25, 'mn', { usdRate: NaN, usdRateDate: today }, today)).toBeNull()
    expect(rateIsFresh(s, today)).toBe(true)
    expect(rateIsFresh(s, '2026-11-25')).toBe(false)
  })
})

describe('caja', () => {
  it('detecta cuadre, faltante y sobrante sin errores de decimales', () => {
    expect(cashDifference(0.3, 0.1 + 0.2)).toEqual({ status: 'cuadra', amount: 0 })
    expect(cashDifference(90, 100)).toEqual({ status: 'faltante', amount: 10 })
    expect(cashDifference(105.5, 100)).toEqual({ status: 'sobrante', amount: 5.5 })
  })
  it('separa los cajones: efectivo USD, efectivo MN y tarjeta', () => {
    const m = (kind: Movement['kind'], amount: number, method: Movement['method'], paid: number) =>
      ({ kind, amount, method, paid }) as Movement
    const s = summarize([m('mensualidad', 20, 'mn', 2400), m('venta', 25, 'tarjeta', 3000), m('mensualidad', 20, 'usd', 20), m('venta', 0.5, 'usd', 0.5)])
    expect(s.memberships).toEqual({ count: 2, total: 40 })
    expect(s.sales).toEqual({ count: 2, total: 25.5 })
    expect(s.expected).toEqual({ usd: 20.5, mn: 2400, card: 3000 })
    expect(s.total).toBe(65.5)
  })
  it('cuadra cada cajón por separado', () => {
    const base = { expectedMN: 2460, expectedUSD: 20 }
    expect(shiftDifference({ ...base, countedMN: 2460, countedUSD: 20 }).balanced).toBe(true)
    const d = shiftDifference({ ...base, countedMN: 2360, countedUSD: 21 })
    expect(d.balanced).toBe(false)
    expect(d.mn).toEqual({ status: 'faltante', amount: 100 })
    expect(d.usd).toEqual({ status: 'sobrante', amount: 1 })
  })
})

describe('whatsapp', () => {
  it('agrega el prefijo de país una sola vez', () => {
    expect(whatsappLink('55 1234 5678', '52', 'hola')).toBe('https://wa.me/525512345678?text=hola')
    expect(whatsappLink('+52 55 1234 5678', '52', 'hola')).toBe('https://wa.me/525512345678?text=hola')
  })
})

describe('carnet', () => {
  it('normaliza espacios, puntos y guiones', () => {
    expect(normalizeCarnet(' 12.345-678 a ')).toBe('12345678A')
  })
  it('valida longitud y caracteres', () => {
    expect(isValidCarnet('90010112345')).toBe(true)
    expect(isValidCarnet('1234')).toBe(false)
    expect(isValidCarnet('1234567890123456')).toBe(false)
    expect(isValidCarnet('12 34$5')).toBe(false)
    expect(isValidCarnet('')).toBe(false)
  })
  it('detecta duplicados aunque cambie el formato', () => {
    const cs = [{ id: 'a', carnet: '12345678A' }] as Client[]
    expect(findByCarnet(cs, '12.345-678 a')?.id).toBe('a')
    expect(findByCarnet(cs, '99999')).toBeUndefined()
  })
})
