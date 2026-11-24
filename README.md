# BASTO GYM

App de gestión de gimnasio (PWA). React + Vite + Tailwind; Supabase previsto para datos, login y fotos.

## Estado
- ✅ Pantallas del trabajador: Inicio, Inscribir, Pagos, Tienda, Cierre de caja.
- ✅ Panel del administrador (`/admin`): Resumen, Clientes, Productos, Cierres y Ajustes. Sin login todavía.
- ⏳ Supabase: hoy los datos viven en `localStorage` (`src/data/store.tsx`), con datos de ejemplo.

## Desarrollo
```
npm install
npm run dev      # servidor local
npm test         # lógica de negocio (src/lib)
npm run build    # typecheck + build PWA
```

Moneda, país y precios de planes: `src/data/seed.ts` (`defaultSettings`).

## Fotos (WebP + GitHub)
- **Productos → GitHub** (rama `media`, servidas por jsDelivr). **Clientes → Supabase** (son datos personales; nunca en un repo).
- El navegador convierte a **WebP** antes de subir (`src/lib/image.ts`; en Safari usa un módulo WASM de respaldo). El JPG original no se sube ni se guarda.
- Subir a GitHub desde el navegador expondría el token, así que lo hace la función `supabase/functions/upload-image`:
  solo acepta WebP reales (≤ 300 KB), solo en `products/`, y solo del usuario con `app_metadata.role = "admin"`.
  Cada foto tiene nombre único (`products/<id>-<timestamp>.webp`); al reemplazarla se borra la anterior.

### Puesta en marcha
1. Crear la rama de medios: `git checkout --orphan media && git rm -rf . && git commit --allow-empty -m "media" && git push origin media`
2. Crear un token fine-grained de GitHub **solo para este repo**, permiso *Contents: Read and write*.
3. `supabase secrets set GITHUB_TOKEN=... GITHUB_REPO=criptobox/basto-gym ALLOWED_ORIGIN=https://tu-dominio`
4. `supabase functions deploy upload-image`
5. Poner la URL de la función en `.env` → `VITE_MEDIA_UPLOAD_URL` (ver `.env.example`).
6. jsDelivr solo sirve repos **públicos**: está bien para fotos de productos, no para fotos de clientes.

Sin `VITE_MEDIA_UPLOAD_URL` (desarrollo) las fotos se guardan localmente como data URL.
