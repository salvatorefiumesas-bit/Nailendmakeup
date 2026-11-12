# Nails & Makeup – Prenota

Pagina di prenotazione online con area riservata. Hosting su GitHub Pages, login e dati su Firebase (progetto `nailsendmakeup`).

## File
- `index.html`: la pagina (clienti + area riservata, raggiungibile da `#gestione`)
- `firestore.rules`: regole di sicurezza da incollare nella console Firebase (non si attivano da GitHub)
- `manifest.webmanifest`, `sw.js`, `icons/`: icone e installazione come app sul telefono
- `qr-nails-makeup.png` e `.svg`: QR code della pagina, da stampare

## Configurazione Firebase
1. Authentication: attiva "Email/password" e crea l'utente della titolare.
2. Firestore Database: crea il database e pubblica le regole di `firestore.rules`.
3. Crea il documento `admins/<UID dell'utente>` (un campo qualsiasi): solo chi lo ha entra nell'area riservata.
4. Authentication > Impostazioni > Domini autorizzati: aggiungi `TUONOME.github.io`.

## Pubblicazione
Settings > Pages > Source: "Deploy from a branch" > ramo `main`, cartella `/ (root)`.

## App Android
La cartella `app-android/` racchiude lo stesso sito in un'app Android (Capacitor). Non c'è niente da modificare lì: si cambia solo `index.html` e l'app segue.
- A ogni modifica su `main`, GitHub Actions ("App Android") compila l'APK e lo pubblica in **Releases**.
- Link fisso per scaricare l'ultima versione: `https://github.com/salvatorefiumesas-bit/Nailendmakeup/releases/latest/download/NailsMakeup.apk`
- Firma: chiave cifrata `app-android/firma-app.p12`; la password va nel segreto del repository `NM_KEY_PASSWORD` (Settings > Secrets and variables > Actions). Senza segreto viene creato solo un APK di prova, non pubblicato in Releases. Non perdere la password: senza, l'app installata non si può più aggiornare.
- Nell'app: accesso con email e password (Google non funziona dentro le app senza configurazione aggiuntiva), dati salvati in modo permanente sul telefono, calendario tramite Google Calendar.
