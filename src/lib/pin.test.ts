import { describe, expect, it } from 'vitest'
import { FREE_ATTEMPTS, attemptsLeft, failLock, hashPin, isValidPin, randomSalt, secondsLeft, verifyPin } from './pin'

describe('claves', () => {
  it('acepta solo exactamente 4 dígitos', () => {
    for (const ok of ['1234', '0000', '9999']) expect(isValidPin(ok)).toBe(true)
    for (const bad of ['123', '12345', '123456', 'abcd', '12 34', '', '１２３４']) expect(isValidPin(bad)).toBe(false)
  })
  it('verifica la clave correcta y rechaza la incorrecta', async () => {
    const salt = randomSalt()
    const h = await hashPin('4821', salt)
    expect(h).toMatch(/^[0-9a-f]{64}$/)
    expect(await verifyPin('4821', salt, h)).toBe(true)
    expect(await verifyPin('4822', salt, h)).toBe(false)
  })
  it('la misma clave con otra sal da otro hash (no se ve quién repite clave)', async () => {
    expect(await hashPin('1111', randomSalt())).not.toBe(await hashPin('1111', randomSalt()))
  })
  it('no guarda la clave en el hash', async () => {
    expect((await hashPin('1234', 'abc')).includes('1234')).toBe(false)
  })
})

describe('bloqueo por intentos', () => {
  it('no bloquea en los primeros intentos y sí desde el 5.º', () => {
    let s = { fails: 0, until: 0 }
    for (let i = 1; i < FREE_ATTEMPTS; i++) { s = failLock(s, 1000); expect(s.until).toBe(0) }
    expect(attemptsLeft(s)).toBe(1)
    s = failLock(s, 1000)
    expect(s.until).toBe(1000 + 30_000)
    expect(secondsLeft(s, 1000)).toBe(30)
    expect(attemptsLeft(s)).toBe(0)
  })
  it('la espera se duplica y tiene tope de 10 minutos', () => {
    let s = { fails: FREE_ATTEMPTS, until: 0 }
    expect(failLock(s, 0).until).toBe(60_000)
    s = { fails: 40, until: 0 }
    expect(failLock(s, 0).until).toBe(600_000)
  })
})
