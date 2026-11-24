// Supabase Edge Function (Deno): sube/borra fotos de productos en GitHub.
// El token de GitHub vive solo aquí, como secreto. Solo administradores pueden usarla.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { decodeBase64, validatePath, validateUpload } from '../_shared/validate.ts'

const REPO = Deno.env.get('GITHUB_REPO') ?? 'criptobox/basto-gym'
const BRANCH = Deno.env.get('GITHUB_MEDIA_BRANCH') ?? 'media'
const TOKEN = Deno.env.get('GITHUB_TOKEN')!
const API = `https://api.github.com/repos/${REPO}/contents`
const ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

const cors = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const gh = (path: string, init: RequestInit = {}) =>
  fetch(`${API}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'basto-gym-media',
      ...init.headers,
    },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST' && req.method !== 'DELETE') return json({ error: 'Método no permitido' }, 405)

  // 1) Quién llama: JWT de Supabase verificado + rol de administrador.
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer /, '')
  if (!jwt) return json({ error: 'No autenticado' }, 401)
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
  const { data, error } = await sb.auth.getUser(jwt)
  if (error || !data.user) return json({ error: 'Sesión inválida' }, 401)
  if (data.user.app_metadata?.role !== 'admin') return json({ error: 'Solo el administrador puede gestionar fotos' }, 403)

  const body = await req.json().catch(() => null)
  if (!body) return json({ error: 'Cuerpo inválido' }, 400)

  // 2) Borrar
  if (req.method === 'DELETE') {
    const bad = validatePath(body.path)
    if (bad) return json({ error: bad }, 400)
    const cur = await gh(`${body.path}?ref=${BRANCH}`)
    if (cur.status === 404) return json({ ok: true })
    if (!cur.ok) return json({ error: 'No se pudo consultar GitHub' }, 502)
    const { sha } = await cur.json()
    const del = await gh(body.path, {
      method: 'DELETE',
      body: JSON.stringify({ message: `media: borrar ${body.path}`, sha, branch: BRANCH }),
    })
    return del.ok ? json({ ok: true }) : json({ error: 'GitHub rechazó el borrado' }, 502)
  }

  // 3) Subir (solo WebP, validado por contenido, no por extensión)
  let bytes: Uint8Array
  try { bytes = decodeBase64(String(body.contentBase64 ?? '')) } catch { return json({ error: 'Base64 inválido' }, 400) }
  const bad = validateUpload(body.path, bytes)
  if (bad) return json({ error: bad }, 400)

  const put = await gh(body.path, {
    method: 'PUT',
    body: JSON.stringify({
      message: `media: subir ${body.path}`,
      content: String(body.contentBase64),
      branch: BRANCH,
    }),
  })
  if (put.status === 422) return json({ error: 'La imagen ya existe' }, 409)
  if (!put.ok) return json({ error: 'GitHub rechazó la subida' }, 502)

  return json({ url: `https://cdn.jsdelivr.net/gh/${REPO}@${BRANCH}/${body.path}` }, 201)
})
