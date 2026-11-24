import { describe, expect, it } from 'vitest'
import { MAX_BYTES, decodeBase64, isWebP, validatePath, validateUpload } from './validate'

const id = '123e4567-e89b-12d3-a456-426614174000'
const webp = (extra = 20) => {
  const b = new Uint8Array(12 + extra)
  b.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0)
  b.set([...'WEBP'].map((c) => c.charCodeAt(0)), 8)
  return b
}

describe('validación de subidas', () => {
  it('acepta un WebP con ruta válida', () => {
    expect(validateUpload(`products/${id}-1732400000000.webp`, webp())).toBeNull()
  })
  it('rechaza JPG y PNG aunque se llamen .webp', () => {
    expect(isWebP(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(false)
    expect(validateUpload(`products/${id}-1732400000000.webp`, new Uint8Array(50))).toMatch(/WebP/)
  })
  it('rechaza rutas fuera de products/ o con path traversal', () => {
    for (const p of ['../.github/workflows/x.webp', 'products/../x.webp', `clients/${id}-1732400000000.webp`, `products/${id}.jpg`, 'products/a.webp', 42, null]) {
      expect(validatePath(p)).not.toBeNull()
    }
  })
  it('rechaza archivos vacíos o demasiado grandes', () => {
    const p = `products/${id}-1732400000000.webp`
    expect(validateUpload(p, new Uint8Array(0))).toMatch(/vacía/)
    expect(validateUpload(p, webp(MAX_BYTES))).toMatch(/supera/)
  })
  it('decodifica base64', () => {
    expect([...decodeBase64(btoa('RIFF'))]).toEqual([82, 73, 70, 70])
  })
})
