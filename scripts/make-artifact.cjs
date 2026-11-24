#!/usr/bin/env node
/**
 * Convierte dist-artifact/index.html (build de un solo archivo) en `page.html`: un fragmento sin
 * <html>, <head> ni <body>, con el <title>, la fuente, el CSS y el JS incrustados, como pide el
 * visor de artefactos. Después de `npm run build:artifact`, publica page.html (un solo archivo).
 */
const fs = require('fs')
const path = require('path')

const dir = path.resolve(__dirname, '..', 'dist-artifact')
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8')

const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])
const scripts = [...html.matchAll(/<script[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1])
if (!styles.length || !scripts.length) throw new Error('No encontré el CSS o el JS incrustados en index.html')
if (/https?:\/\/(?!fonts\.(googleapis|gstatic)\.com|www\.w3\.org)/.test(styles.join('') + scripts.join('')) === false) { /* sin referencias externas inesperadas */ }

const page = `<title>BASTO GYM</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" />
<style>${styles.join('\n')}</style>
<div id="root"></div>
<script type="module">${scripts.join('\n')}</script>
`
fs.writeFileSync(path.join(dir, 'page.html'), page)
console.log('page.html', (Buffer.byteLength(page) / 1024).toFixed(0), 'KB')
