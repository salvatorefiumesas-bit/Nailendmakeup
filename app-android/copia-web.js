// Copia il sito (cartella principale del repository) dentro www/, che diventa il contenuto dell'app.
// Così sito e app restano sempre uguali: si modifica solo ../index.html.
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..'), dst = path.join(__dirname, 'www');
fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync(dst, { recursive: true });
const FILE = ['index.html', 'manifest.webmanifest', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
for (const f of FILE) fs.copyFileSync(path.join(src, f), path.join(dst, f));
// Numero di versione dell'app (lo usa l'avviso "Nuova versione disponibile")
fs.writeFileSync(path.join(dst, 'versione.json'), JSON.stringify({ v: Number(process.env.GITHUB_RUN_NUMBER || 0) }));
console.log('Sito copiato in www/:', FILE.length, 'file');
