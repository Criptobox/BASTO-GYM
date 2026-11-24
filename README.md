# BASTO GYM

App de gestión de gimnasio (PWA). React + Vite + Tailwind; Supabase previsto para datos, login y fotos.

## Estado
- ✅ Pantallas del trabajador: Inicio, Inscribir, Pagos, Tienda, Cierre de caja.
- ✅ Panel del administrador (`/admin`): Resumen, Clientes, Productos, Cierres y Ajustes. Sin login todavía.
- ⏳ Supabase: hoy los datos viven en `localStorage` (`src/data/store.tsx`), con datos de ejemplo.

## Demo navegable
`npm run build:artifact` genera `dist-artifact/page.html`: la app completa en **un solo archivo** (CSS, JS y logo incrustados), con enrutado en memoria, sin PWA y con datos de ejemplo. Incluye al administrador y a dos trabajadores con claves públicas de prueba (`9999`, `1111`, `2222`) que **solo existen en esa compilación** (`MODE=artifact`, ver `src/data/demo.ts`); la compilación normal no las trae. En la demo el convertidor WebP de respaldo (Safari) no está disponible.

## Desarrollo
```
npm install
npm run dev      # servidor local
npm test         # lógica de negocio (src/lib)
npm run build    # typecheck + build PWA
```

## Acceso por clave
- Primer uso: la app pide crear la clave del **administrador** (no hay claves de fábrica). Él da de alta a cada trabajador con su clave (4 a 6 números) en *Trabajadores*.
- Cada trabajador entra con su nombre y clave, **abre su turno** y todo cobro y cierre queda a su nombre (`worker` / `workerId` en cada movimiento y turno).
- Un trabajador solo ve la caja de **su** turno. Si otro tiene un turno abierto no se puede entrar; el administrador puede cerrarlo desde *Cierres*.
- 5 claves incorrectas seguidas bloquean la cuenta 30 s (se duplica en cada fallo, máx. 10 min). La sesión se cierra tras 5 min sin actividad.
- Las claves se guardan con PBKDF2-SHA256 y sal propia, nunca en claro. **Aun así esto es solo responsabilidad, no seguridad real:** los datos viven en el navegador y cualquiera con acceso al dispositivo puede leerlos o alterarlos. La seguridad real llega con Supabase Auth y reglas por rol.

## Logo
Vectorizado a partir de la referencia (`brand/referencia-estados.jpg`): `brand/logo.svg`, un escudo hexagonal con marco dorado, una **B** de contorno de acero y una **G** dorada.
Estados (componente `LogoMark`, vista previa en *Ajustes → Logo y estados*): normal, **activo** (resplandor), **inactivo** (gris: cuenta bloqueada, turno cerrado), **cargando** (anillo que gira) y **aviso** (globo rojo). El icono de la app instalada muestra el número de pagos pendientes (Badging API, solo si el sistema lo permite).
`node scripts/build-logo.cjs` genera `public/logo.svg` y los iconos PNG (192, 512, maskable, apple-touch, favicon). Necesita Playwright (`npm i -D playwright`).

## Monedas
- Los **precios están en USD**. Se cobra en **USD**, **MN** o **tarjeta** (la tarjeta se cobra en MN).
- MN y tarjeta = precio × **tasa del día** (MN por 1 USD), a pesos enteros. La tasa se fija cada día en Inicio o en Ajustes;
  si no es de hoy, MN y tarjeta quedan bloqueados (nunca se cobra con una tasa vieja). Cada cobro guarda la tasa usada.
- Un cobro puede **combinar métodos** (p. ej. 8 USD + el resto en MN, o USD + tarjeta + MN): cada parte se guarda con su moneda y su tasa, y el cierre las reparte en su cajón. Debe cubrir el precio exacto (tolerancia de medio peso por redondeo); el vuelto no se registra.
- La caja tiene **dos cajones de efectivo** (MN y USD) más la tarjeta; el cierre cuenta y cuadra cada uno por separado.
- Valores de ejemplo (tasa, precios, país): `src/data/seed.ts` (`defaultSettings`).

## Fotos (WebP + GitHub)
- Solo hay fotos de **productos** → GitHub (rama `media`, servidas por jsDelivr). Los clientes no llevan foto: solo nombre, carnet y teléfono.
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
6. jsDelivr solo sirve repos **públicos**: está bien para fotos de productos. Nunca subas datos de clientes a un repo.

Sin `VITE_MEDIA_UPLOAD_URL` (desarrollo) las fotos se guardan localmente como data URL.
