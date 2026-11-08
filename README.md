# Nails & Makeup – Prenota

Pagina di prenotazione online con area riservata. Hosting su GitHub Pages, login e dati su Firebase (progetto `nailsendmakeup`).

## File
- `index.html`: la pagina (clienti + area riservata, raggiungibile da `#gestione`)
- `firestore.rules`: regole di sicurezza da incollare nella console Firebase (non si attivano da GitHub)
- `manifest.webmanifest`, `sw.js`, `icons/`: icone e installazione come app sul telefono

## Configurazione Firebase
1. Authentication: attiva "Email/password" e crea l'utente della titolare.
2. Firestore Database: crea il database e pubblica le regole di `firestore.rules`.
3. Crea il documento `admins/<UID dell'utente>` (un campo qualsiasi): solo chi lo ha entra nell'area riservata.
4. Authentication > Impostazioni > Domini autorizzati: aggiungi `TUONOME.github.io`.

## Pubblicazione
Settings > Pages > Source: "Deploy from a branch" > ramo `main`, cartella `/ (root)`.
