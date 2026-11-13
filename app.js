/* Nails & Makeup – app clienti (stesso modello di Radici) */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signInWithPopup, signInWithCredential, GoogleAuthProvider, signOut, deleteUser } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, onSnapshot, query, where, getDocs, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const VERSIONE = '1.0';
const SALONE = 'nails';
const fbApp = initializeApp({ apiKey: 'AIzaSyC59ymVazp-_GIT5kI-O6HL0hLUi7KPvLc', authDomain: 'nailsendmakeup.firebaseapp.com', projectId: 'nailsendmakeup', storageBucket: 'nailsendmakeup.firebasestorage.app', messagingSenderId: '205109970124', appId: '1:205109970124:web:bab08c55d651b4a7842e69' });
const auth = getAuth(fbApp), db = getFirestore(fbApp);
const colP = collection(db, 'saloni', SALONE, 'prenotazioni'), colB = collection(db, 'saloni', SALONE, 'busy'), colA = collection(db, 'saloni', SALONE, 'avvisi'), colG = collection(db, 'saloni', SALONE, 'galleria'), colF = collection(db, 'saloni', SALONE, 'punti'), colQ = collection(db, 'saloni', SALONE, 'richieste');

/* ---------- utilità ---------- */
const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const p2 = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
const hm = m => p2(Math.floor(m / 60)) + ':' + p2(m % 60);
const fd = m => m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + m % 60 : '');
const oggi = () => iso(new Date());
const oraMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const dataLunga = k => new Date(k + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const ORD = [1, 2, 3, 4, 5, 6, 0];
const cp = o => JSON.parse(JSON.stringify(o));
function toast(t) { document.querySelectorAll('.toast').forEach(x => x.remove()); const e = document.createElement('div'); e.className = 'toast'; e.textContent = t; document.body.appendChild(e); setTimeout(() => e.remove(), 2600); }
function dialogo(t, p, ok, no) { return new Promise(r => { $('dlgT').textContent = t; $('dlgP').textContent = p || ''; $('dlgOk').textContent = ok; $('dlgNo').textContent = no || ''; $('dlgNo').hidden = !no; $('dlg').hidden = false; const f = v => { $('dlg').hidden = true; r(v); }; $('dlgOk').onclick = () => f(true); $('dlgNo').onclick = () => f(false); }); }
const avvisa = t => dialogo('Attenzione', t, 'Ok');
const iniziali = n => String(n || '?').trim().split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
const avatar = st => `<span class="av">${st && st.foto ? `<img src="${esc(st.foto)}" alt="">` : esc(iniziali(st && st.nome))}</span>`;

/* ---------- dati del salone ---------- */
let C = cp(window.RADICI_SEED);
let BUSY = [], busyOk = false, utente = null, PROF = null, MIE = [], mieOk = false, storico = false;
let sel = [], staffSel = 'any', giorno = null, ora = null, mese = null;
let prCfg = false, prAuth = false;
const prova = () => { if (prCfg && prAuth && window.splashPronto) window.splashPronto(); };
onSnapshot(doc(db, 'saloni', SALONE), s => { if (s.exists()) { C = Object.assign(cp(window.RADICI_SEED), window.fasceDaDb(s.data())); window.splashDati && window.splashDati(C); promemoriaLocali(); sel = sel.filter(id => serv(id)); ridisegna(); } prCfg = true; prova(); }, () => { prCfg = true; prova(); });
onSnapshot(colB, s => { BUSY = s.docs.map(d => d.data()); busyOk = true; if (PAG === 'p3') renderSlots(); }, () => { busyOk = true; });

const serv = id => C.servizi.find(s => s.id === id);
const cat = id => C.categorie.find(c => c.id === id);
const tipo = s => (s && cat(s.cat) && cat(s.cat).tipo) || 'base';
const visibili = () => C.servizi.filter(s => s.visibile !== false);
const scelti = () => sel.map(serv).filter(Boolean);
const durTot = () => { const d = scelti().map(s => +s.durata || 0); return d.length ? (C.regole.tempiDinamici ? d.reduce((a, b) => a + b, 0) : Math.max(...d)) : 0; };
const unisci = (...a) => a.filter(Boolean).join(' · ');
const suRichiesta = () => scelti().some(s => s.richiesta);
function prezzoTot() {
  if (!scelti().some(s => /\d/.test(String(s.prezzo || '')))) return '';
  let tot = 0, da = false;
  scelti().forEach(s => { const m = String(s.prezzo).replace(',', '.').match(/\d+(\.\d+)?/); if (m) tot += +m[0]; if (/partire|da |ad |\bS\b|-/i.test(s.prezzo) || !m) da = true; });
  return (da ? 'da ' : '') + (Number.isInteger(tot) ? tot : tot.toFixed(2)) + ' €';
}
const staffPer = ids => C.staff.filter(st => !(st.servizi && st.servizi.length) || ids.every(id => st.servizi.includes(id)));
const chiusura = k => C.chiusure.find(c => k >= c.da && k <= c.a);
function fasce(k) { if (chiusura(k)) return []; const e = C.eccezioni.find(x => x.data === k); if (e) return e.fasce || []; return C.orari[new Date(k + 'T12:00').getDay()] || []; }
const libero = (st, k, a, b) => !BUSY.some(x => x.data === k && x.staff === st && a < x.fine && x.ini < b);

/* ---------- navigazione: una schermata per passo, il tasto Indietro torna alla precedente ---------- */
let PAG = 'ph', STORIA = ['ph'];
function mostraP(p) {
  if (['p2', 'p3', 'p4', 'pq'].includes(p) && !sel.length) p = 'p1';
  if (p === 'p4' && ora == null) p = 'p3';
  document.querySelectorAll('#pagine>.p').forEach(e => e.hidden = e.id !== p);
  PAG = p;
  ({ ph: renderHome, pi: renderInfo, pl: renderListino, p1: renderServizi, p2: renderOperatori, p3: renderGiorni, p4: renderConferma, pm: renderMie, pp: renderProfilo, pv: aggLegali, pa: renderAvvisi, pt: aggLegali, pf: renderFid, pr: renderReg, pq: renderRichiesta })[p]?.();
  aggBarra(); scrollTo(0, 0);
}
function vai(p) { if (p === 'ph') STORIA = ['ph']; else if (STORIA[STORIA.length - 1] !== p) { STORIA.push(p); try { history.pushState({ r: STORIA.length }, ''); } catch (e) {} } mostraP(p); }
function indietro() { if (STORIA.length > 1) history.back(); else mostraP('ph'); }
addEventListener('popstate', () => { if (!$('viewer').hidden) { chiudiFoto(); return; } for (const id of ['login', 'dlg', 'prof']) if (!$(id).hidden) { $(id).hidden = true; return; } if (STORIA.length > 1) { STORIA.pop(); mostraP(STORIA[STORIA.length - 1]); } });
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { const p = g.dataset.go; if (p === 'pm' && !utente) { apriLogin(); return; } if (p === 'ph' || p === 'p1' && PAG === 'p5') STORIA = ['ph']; vai(p); return; }
  if (e.target.closest('[data-back]')) indietro();
});
function ridisegna() { mostraP(PAG); }

function aggBarra() {
  let t = '', fn = null;
  if (PAG === 'p1' && sel.length) { t = suRichiesta() ? esc(scelti()[0].nome) + '<small>su richiesta</small>' : sel.length + (sel.length === 1 ? ' trattamento' : ' trattamenti') + `<small>${unisci(fd(durTot()), prezzoTot())}</small>`; fn = () => vai(suRichiesta() ? 'pq' : C.staff.length === 1 ? 'p3' : 'p2'); }
  else if (PAG === 'p3' && ora != null) { t = dataLunga(giorno) + `<small>${unisci('ore ' + hm(ora), fd(durTot()))}</small>`; fn = () => vai('p4'); }
  $('barra').hidden = !fn; $('btxt').innerHTML = t; $('bNext').onclick = fn;
}


/* ---------- avvisi del salone: visibili a tutti, pallino finché non si leggono ---------- */
const numWa = t => { const d = String(t).replace(/\D/g, ''); return String(t).trim().startsWith('+') || (d.startsWith('39') && d.length > 10) ? d : '39' + d; };
let AV = [];
const avAttivi = () => AV.filter(a => a.scade > Date.now()).sort((a, b) => b.creato - a.creato);
const letti = () => { try { return +localStorage.getItem('nmAvvisiLetti') || 0; } catch (e) { return 0; } };
const nonLetti = () => avAttivi().filter(a => a.creato > letti()).length;
function aggAvvisi() { const n = nonLetti(); $('nAvv').textContent = n || ''; $('pAvvN').textContent = n || ''; }
function renderAvvisi() {
  const l = avAttivi();
  $('aList').innerHTML = l.length ? l.map(a => `<div class="row avv${a.creato > letti() ? ' nuovo' : ''}"><b>${esc(a.titolo)}</b><small>${new Date(a.creato).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</small><p>${esc(a.testo)}</p></div>`).join('') : '<p class="vuoto">Nessun avviso dal salone.</p>';
  try { localStorage.setItem('nmAvvisiLetti', String(Date.now())); } catch (e) {}
  aggAvvisi();
}
onSnapshot(colA, s => { AV = s.docs.map(d => d.data()); aggAvvisi(); if (PAG === 'pa') renderAvvisi(); }, () => {});

/* ---------- galleria: miniature scorrevoli, foto grande a schermo intero ---------- */
let GA = [], galAl = null, galL = [], galI = 0;
onSnapshot(colG, s => { GA = s.docs.map(d => d.data()); if (PAG === 'pi') renderGalleria(); }, () => {});
function renderGalleria() {
  const A = (C.album || []).filter(a => GA.some(f => f.album === a.id));
  if (!A.length) { $('iGal').innerHTML = ''; return; }
  if (!galAl || !A.some(a => a.id === galAl)) galAl = A[0].id;
  galL = GA.filter(f => f.album === galAl).sort((a, b) => (a.ordine || 0) - (b.ordine || 0));
  $('iGal').innerHTML = (A.length > 1 ? `<div class="galt">${A.map(a => `<button data-ga="${esc(a.id)}" aria-pressed="${a.id === galAl}">${esc(a.nome)}</button>`).join('')}</div>` : '') +
    `<div class="gals">${galL.map((f, i) => `<button data-gi="${i}" aria-label="Apri foto ${i + 1}"${i ? '' : ' class="on"'}><img src="${f.mini}" alt="" loading="lazy"></button>`).join('')}</div>` +
    (galL.length > 1 ? `<div class="gdot">${galL.map((f, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</div>` : '');
  $('iGal').querySelectorAll('[data-ga]').forEach(b => b.onclick = () => { galAl = b.dataset.ga; renderGalleria(); });
  $('iGal').querySelectorAll('[data-gi]').forEach(b => b.onclick = () => apriFoto(+b.dataset.gi));
  avviaCarosello();
}
/* Carosello: la foto al centro è in primo piano, le altre scorrono da sole ogni 3,5 secondi.
   Si ferma mentre il cliente tocca le foto, quando la pagina non è visibile o se il telefono chiede meno animazioni. */
let carT = null, carFermo = 0;
function avviaCarosello() {
  clearInterval(carT); carT = null;
  const box = $('iGal').querySelector('.gals'); if (!box) return;
  const sl = [...box.children], pt = [...$('iGal').querySelectorAll('.gdot i')];
  const attuale = () => { const c = box.scrollLeft + box.clientWidth / 2; let m = 0, d = 1e9; sl.forEach((b, i) => { const x = Math.abs(b.offsetLeft + b.offsetWidth / 2 - c); if (x < d) { d = x; m = i; } }); return m; };
  const segna = () => { const i = attuale(); sl.forEach((b, j) => b.classList.toggle('on', j === i)); pt.forEach((p, j) => p.classList.toggle('on', j === i)); };
  const vai = i => { const b = sl[i]; if (b) box.scrollTo({ left: b.offsetLeft - (box.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' }); };
  let rq = 0; box.addEventListener('scroll', () => { cancelAnimationFrame(rq); rq = requestAnimationFrame(segna); }, { passive: true });
  const pausa = () => { carFermo = Date.now() + 6000; };
  ['touchstart', 'pointerdown', 'wheel'].forEach(ev => box.addEventListener(ev, pausa, { passive: true }));
  if (sl.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  carT = setInterval(() => {
    if (PAG !== 'pi' || document.hidden || !$('viewer').hidden || Date.now() < carFermo || !box.isConnected) return;
    const i = attuale(); vai(i >= sl.length - 1 ? 0 : i + 1);
  }, 3500);
}
const grandi = {};
async function mostraFoto() {
  const f = galL[galI]; if (!f) return;
  $('vImg').src = f.mini; $('vC').textContent = (galI + 1) + ' / ' + galL.length;
  $('vP').hidden = galI === 0; $('vS').hidden = galI === galL.length - 1;
  try { if (!grandi[f.id]) { const d = await getDoc(doc(db, 'saloni', SALONE, 'galleriaFoto', f.id)); if (d.exists()) grandi[f.id] = d.data().img; } if (grandi[f.id] && galL[galI] === f) $('vImg').src = grandi[f.id]; } catch (e) {}
}
function apriFoto(i) { galI = i; $('viewer').hidden = false; try { history.pushState({ v: 1 }, ''); } catch (e) {} mostraFoto(); }
function chiudiFoto() { if ($('viewer').hidden) return; $('viewer').hidden = true; }
$('vX').onclick = () => history.back();
$('vP').onclick = () => { if (galI > 0) { galI--; mostraFoto(); } };
$('vS').onclick = () => { if (galI < galL.length - 1) { galI++; mostraFoto(); } };
(() => { let x0 = null; $('viewer').addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  $('viewer').addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) (dx < 0 ? $('vS') : $('vP')).click(); }); })();
document.addEventListener('keydown', e => { if ($('viewer').hidden) return; if (e.key === 'ArrowRight') $('vS').click(); else if (e.key === 'ArrowLeft') $('vP').click(); else if (e.key === 'Escape') history.back(); });
/* ---------- home e informazioni ---------- */
function renderTesta() {
  $('bNome').textContent = C.nome; $('bSub').textContent = C.sottotitolo || '';
  $('logo').innerHTML = C.logo ? `<img src="${esc(C.logo)}" alt="">` : esc(iniziali(C.nome)[0]);
  $('cBtn').textContent = utente ? 'Esci' : 'Accedi';
  document.title = C.nome + ' – Prenota';
}
/* Adatta le scritte dei riquadri: se una parola non entra, rimpicciolisce il testo finché ci sta */
function adattaTesti() {
  document.querySelectorAll('#ph .mt b').forEach(b => {
    b.style.fontSize = ''; let f = parseFloat(getComputedStyle(b).fontSize), giri = 0;
    const largo = () => { const r = b.getBoundingClientRect(), q = b.parentNode.getBoundingClientRect(), pad = parseFloat(getComputedStyle(b.parentNode).paddingRight) || 0; return b.scrollWidth > b.clientWidth + 1 || r.right > q.right - pad + 1; };
    while (largo() && f > 9 && giri++ < 30) { f -= 0.5; b.style.fontSize = f + 'px'; }
  });
  /* stessa grandezza per tutte le scritte dello stesso tipo di riquadro, la più piccola che serve */
  ['big', 'sm'].forEach(t => { const l = [...document.querySelectorAll('#ph .mt.' + t + ' b')], m = Math.min(...l.map(b => parseFloat(getComputedStyle(b).fontSize))); l.forEach(b => { b.style.fontSize = m + 'px'; }); });
}
addEventListener('resize', () => { if (PAG === 'ph') { adattaTesti(); disegnaAlbero(); } });
/* ---------- il marchio nello spazio libero sotto il menu: la pennellata si stende la prima volta, poi resta viva ---------- */
let alberoFatto = false, alberoMis = '';
function disegnaAlbero() {
  const el = $('albero'); if (!el || PAG !== 'ph') return;
  const top = el.getBoundingClientRect().top + scrollY, W = Math.round(el.clientWidth), H = Math.min(460, Math.round(innerHeight - top - 14)), sotto = C.sottotitolo || '';
  const mis = W + 'x' + H + sotto; if (mis === alberoMis) { nonSporgere(el); return; } alberoMis = mis;
  if (H < 130 || W < 160) { el.innerHTML = ''; el.style.height = '0'; return; }
  el.style.height = H + 'px';
  if (!nonSporgere(el)) return;
  el.innerHTML = '<div class="marchio"></div>';
  window.radiciMarchio(el.firstChild, sotto, !alberoFatto && !document.getElementById('splash')); alberoFatto = true;
  el.firstChild.onclick = () => ricresci();
}
/* se la pagina è più alta dello schermo (barre di sistema, margini) accorcio lo spazio della scritta, così la home non scorre */
function nonSporgere(el) {
  const extra = document.documentElement.scrollHeight - innerHeight; if (extra <= 0) return true;
  const h2 = el.offsetHeight - extra - 2; if (h2 < 130) { el.innerHTML = ''; el.style.height = '0'; alberoMis = ''; return false; }
  el.style.height = h2 + 'px'; return true;
}
/* ogni tanto la pennellata si ridipinge da sola (ogni 40 secondi circa, solo con la home in vista); toccando la scritta subito */
let ultimaCrescita = Date.now();
function ricresci() { const m = $('albero') && $('albero').firstChild; if (!m || matchMedia('(prefers-reduced-motion: reduce)').matches) return; window.ricresciRadici(m); ultimaCrescita = Date.now(); }
setInterval(() => { if (PAG === 'ph' && !document.hidden && $('viewer').hidden && !document.getElementById('splash') && Date.now() - ultimaCrescita > 40000) ricresci(); }, 5000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && PAG === 'ph' && Date.now() - ultimaCrescita > 20000) setTimeout(ricresci, 400); });
function renderHome() {
  renderTesta();
  $('cover').querySelector('img')?.remove();
  if (C.cover) $('cover').insertAdjacentHTML('afterbegin', `<img src="${esc(C.cover)}" alt="">`);
  $('hTit').textContent = utente && PROF && PROF.nome ? 'Ciao ' + PROF.nome : C.nome;
  $('hSub').textContent = C.sottotitolo || 'Prenota in pochi tocchi';
  const fut = MIE.filter(attiva).length; $('nMie').textContent = fut || ''; aggAvvisi();
  const ch = C.chiusure.find(c => c.a >= oggi()); $('nChiuso').textContent = ch ? '!' : '';
  requestAnimationFrame(() => { adattaTesti(); disegnaAlbero(); }); if (document.fonts) document.fonts.ready.then(() => { adattaTesti(); disegnaAlbero(); });
}
function renderInfo() {
  $('iNome').textContent = C.nome;
  const q = [];
  if (C.telefono) q.push(`<a class="qt" href="tel:${esc(C.telefono.replace(/[^\d+]/g, ''))}">${ico('tel')}<span>Chiama</span></a>`);
  if (C.whatsapp) q.push(`<a class="qw" href="https://wa.me/${esc(numWa(C.whatsapp))}" target="_blank" rel="noopener">${ico('chat')}<span>WhatsApp</span></a>`);
  if (C.instagram) q.push(`<a class="qi" href="https://instagram.com/${esc(C.instagram.replace(/^@/, ''))}" target="_blank" rel="noopener">${ico('insta')}<span>Instagram</span></a>`);
  if (C.indirizzo) q.push(`<a class="qm" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(C.indirizzo)}" target="_blank" rel="noopener">${ico('mappa')}<span>Indicazioni</span></a>`);
  $('iQa').innerHTML = q.join(''); $('iQa').hidden = !q.length;
  const ch = C.chiusure.filter(c => c.a >= oggi()).sort((a, b) => a.da.localeCompare(b.da))[0];
  $('iChiuso').innerHTML = ch ? `<div class="row" style="margin-top:14px"><b>Chiuso ${ch.da === ch.a ? dataLunga(ch.da) : 'dal ' + dataLunga(ch.da) + ' al ' + dataLunga(ch.a)}</b>${ch.msg ? `<small>${esc(ch.msg)}</small>` : ''}</div>` : '';
  $('iAddr').innerHTML = C.indirizzo ? `<h3>Indirizzo</h3><p style="margin:0">${esc(C.indirizzo)}</p>` : '';
  $('iDesc').textContent = C.descrizione || '';
  renderGalleria();
  $('iStaff').innerHTML = C.staff.map(st => `<div class="op">${avatar(st)}<b>${esc(st.nome)}</b></div>`).join('');
  const d = new Date().getDay();
  $('iOrari').innerHTML = ORD.map(g => { const f = C.orari[g] || []; return `<div class="orw${g === d ? ' oggi' : ''}"><b>${GIORNI[g].slice(0, 3).toUpperCase()}</b><span>${f.length ? f.map(x => hm(x[0]) + ' – ' + hm(x[1])).join('&nbsp;&nbsp; ') : 'Chiuso'}</span></div>`; }).join('');
}
function renderListino() {
  $('lAcc').innerHTML = C.categorie.map(c => { const l = visibili().filter(s => s.cat === c.id); if (!l.length) return '';
    return `<div class="acc"><button>${ico(c.icona)}<b>${esc(c.nome)}</b><i>⌄</i></button><div class="ls" hidden>${l.map(s => `<div class="lr"><div class="t"><b>${esc(s.nome)}</b>${s.descr ? `<small>${esc(s.descr)}</small>` : ''}</div><div class="p"><b>${esc(s.prezzo)}</b><span>${fd(s.durata)}</span></div></div>`).join('')}</div></div>`; }).join('');
  $('lAcc').querySelectorAll('.acc>button').forEach(b => b.onclick = () => { const a = b.parentNode, ls = a.querySelector('.ls'); ls.hidden = !ls.hidden; a.toggleAttribute('open', !ls.hidden); });
}

/* ---------- 1. servizi, con le regole: max servizi, una sola combo, aggiuntivi solo con un servizio base ---------- */
function puoi(s) {
  if (sel.includes(s.id)) return '';
  if (s.richiesta && sel.length || suRichiesta()) return 'Trucco sposa e cerimonia si chiedono da soli: togli prima l’altro trattamento.';
  if (sel.length >= C.regole.maxServizi) return 'Puoi scegliere al massimo ' + C.regole.maxServizi + ' servizi per prenotazione.';
  const t = tipo(s);
  if (t === 'combo' && scelti().some(x => tipo(x) === 'combo')) return 'Puoi scegliere una sola combo per prenotazione.';
  if (t === 'aggiuntivo' && !scelti().some(x => tipo(x) !== 'aggiuntivo')) return 'Questo servizio si aggiunge a un taglio, a uno styling o a una combo: scegli prima quello.';
  if (!staffPer(sel.concat(s.id)).length) return 'Nessun operatore esegue questo servizio insieme a quelli già scelti.';
  return '';
}
function renderServizi() {
  $('h1').textContent = C.regole.maxServizi === 1 ? 'Scegli il trattamento. Trucco sposa e cerimonia sono su richiesta: ti ricontatto io.' : 'Puoi sceglierne fino a ' + C.regole.maxServizi + '. La durata si calcola da sola.';
  $('sGrid').innerHTML = C.categorie.map(c => { const l = visibili().filter(s => s.cat === c.id); if (!l.length) return '';
    return `<div class="gl">${ico(c.icona)}${esc(c.nome)}</div><div class="grid">${l.map(s => `<button class="sv${puoi(s) ? ' off' : ''}" data-s="${s.id}" aria-pressed="${sel.includes(s.id)}">${s.descr ? `<span class="inf" data-info="${s.id}">i</span>` : ''}${ico(s.icona)}<b>${esc(s.nome)}</b><small>${s.richiesta ? 'Su richiesta' : unisci(esc(s.prezzo), fd(s.durata))}</small></button>`).join('')}</div>`; }).join('');
  $('sGrid').querySelectorAll('.sv').forEach(b => b.onclick = e => {
    const s = serv(b.dataset.s);
    if (e.target.closest('[data-info]')) { dialogo(s.nome, s.descr + '\n' + (s.richiesta ? 'Su richiesta' : unisci(s.prezzo, fd(s.durata))), 'Ok'); return; }
    if (sel.includes(s.id)) { sel = sel.filter(x => x !== s.id); if (!scelti().some(x => tipo(x) !== 'aggiuntivo')) sel = []; }
    else { const no = puoi(s); if (no) { toast(no); return; } sel.push(s.id); }
    staffSel = 'any'; ora = null; renderServizi(); aggBarra();
  });
}

/* ---------- 2. operatore ---------- */
function renderOperatori() {
  const l = staffPer(sel);
  $('oList').innerHTML = `<button class="op" data-o="any" aria-pressed="${staffSel === 'any'}"><span class="av">★</span><b>Indifferente<br><small style="color:var(--mute);font-weight:500">il primo libero</small></b></button>` +
    l.map(st => `<button class="op" data-o="${st.id}" aria-pressed="${staffSel === st.id}">${avatar(st)}<b>${esc(st.nome)}</b></button>`).join('');
  $('oList').querySelectorAll('.op').forEach(b => b.onclick = () => { staffSel = b.dataset.o; ora = null; vai('p3'); });
}

/* ---------- 3. giorno e ora ---------- */
function giornoOk(k) { const t = oggi(), max = new Date(); max.setDate(max.getDate() + C.regole.giorniMax); return k >= t && k <= iso(max) && fasce(k).length > 0; }
function renderGiorni() {
  const t = new Date(); if (!mese) mese = { y: t.getFullYear(), m: t.getMonth() };
  const max = new Date(); max.setDate(max.getDate() + C.regole.giorniMax);
  const f = new Date(mese.y, mese.m, 1), off = (f.getDay() + 6) % 7, n = new Date(mese.y, mese.m + 1, 0).getDate();
  let g = ['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(x => `<span class="wd">${x}</span>`).join('') + '<span></span>'.repeat(off);
  for (let d = 1; d <= n; d++) { const k = iso(new Date(mese.y, mese.m, d)); g += `<button data-k="${k}" ${giornoOk(k) ? '' : 'disabled'} aria-pressed="${giorno === k}">${d}</button>`; }
  const prevOff = mese.y * 12 + mese.m <= t.getFullYear() * 12 + t.getMonth(), nextOff = mese.y * 12 + mese.m >= max.getFullYear() * 12 + max.getMonth();
  $('dCal').innerHTML = `<div class="cal"><div class="calh"><button data-n="-1" ${prevOff ? 'disabled' : ''} aria-label="Mese precedente">‹</button><b>${f.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</b><button data-n="1" ${nextOff ? 'disabled' : ''} aria-label="Mese successivo">›</button></div><div class="cg">${g}</div></div>`;
  $('dCal').querySelectorAll('[data-n]').forEach(b => b.onclick = () => { const x = new Date(mese.y, mese.m + +b.dataset.n, 1); mese = { y: x.getFullYear(), m: x.getMonth() }; renderGiorni(); });
  $('dCal').querySelectorAll('[data-k]').forEach(b => b.onclick = () => { giorno = b.dataset.k; ora = null; renderGiorni(); aggBarra(); $('dSlots').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  renderSlots();
}
function liberiA(k, m, dur) { const c = staffSel === 'any' ? staffPer(sel) : C.staff.filter(s => s.id === staffSel); return c.filter(st => libero(st.id, k, m, m + dur)); }
function orariLiberi(k) {
  const dur = durTot(), out = [], lim = k === oggi() ? oraMin() + C.regole.anticipoMin : -1;
  fasce(k).forEach(([a, b]) => { for (let m = a; m + dur <= b; m += C.regole.passo) if (m >= lim && liberiA(k, m, dur).length) out.push(m); });
  return out;
}
function renderSlots() {
  if (!giorno) { $('dSlots').innerHTML = ''; $('dMsg').textContent = 'Scegli un giorno.'; return; }
  if (!busyOk) { $('dSlots').innerHTML = '<div class="spin"></div>'; return; }
  const l = orariLiberi(giorno);
  $('dSlots').innerHTML = l.map(m => `<button class="slot" data-m="${m}" aria-pressed="${ora === m}">${hm(m)}</button>`).join('');
  $('dMsg').textContent = l.length ? '' : 'Nessun orario libero in questo giorno: provane un altro.';
  $('dSlots').querySelectorAll('.slot').forEach(b => b.onclick = () => { ora = +b.dataset.m; renderSlots(); aggBarra(); });
}

/* ---------- 4. conferma ---------- */
function renderConferma() {
  const st = staffSel === 'any' ? null : C.staff.find(s => s.id === staffSel);
  $('riep').innerHTML = `<b>${esc(dataLunga(giorno))}, ore ${hm(ora)}</b><small>${unisci(C.staff.length === 1 ? '' : st ? 'con ' + esc(st.nome) : 'Operatore: il primo libero', fd(durTot()), prezzoTot())}</small><div>${scelti().map(s => `<span class="chip">${esc(s.nome)}</span>`).join('')}</div>`;
  $('cLogin').hidden = !!utente; $('cDati').hidden = !utente; $('err').textContent = '';
  if (utente) { const p = PROF || {}; if (!$('fNome').value) $('fNome').value = p.nome || ''; if (!$('fCogn').value) $('fCogn').value = p.cogn || ''; if (!$('fTel').value) $('fTel').value = p.tel || ''; }
}
$('cAccedi').onclick = () => apriLogin();
$('bConf').onclick = async () => {
  const b = $('bConf'), E = t => { $('err').textContent = t; };
  const n = $('fNome').value.trim(), c = $('fCogn').value.trim(), t = $('fTel').value.trim(), note = $('fNote').value.trim();
  if (!n || !c) return E('Inserisci nome e cognome.');
  if (t.replace(/\D/g, '').length < 6) return E('Inserisci un numero di telefono valido.');
  b.classList.add('load');
  try {
    const s = await getDocs(query(colP, where('uid', '==', utente.uid)));
    const att = s.docs.map(d => d.data()).filter(attiva).length;
    if (att >= C.regole.maxAttive) { b.classList.remove('load'); return E('Hai già ' + att + ' prenotazioni in programma: il massimo è ' + C.regole.maxAttive + '. Annullane una o contatta il salone.'); }
  } catch (x) { b.classList.remove('load'); return E('Non riesco a controllare le tue prenotazioni. Controlla la connessione e riprova.'); }
  const dur = durTot(), lib = liberiA(giorno, ora, dur);
  if (!lib.length || (giorno === oggi() && ora < oraMin() + C.regole.anticipoMin)) { b.classList.remove('load'); ora = null; await avvisa('Questo orario non è più disponibile: scegline un altro.'); indietro(); return; }
  const conta = id => BUSY.filter(x => x.data === giorno && x.staff === id).length;
  const st = lib.sort((a, z) => conta(a.id) - conta(z.id))[0];
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const rec = { id, uid: utente.uid, nome: n, cogn: c, tel: t, mail: utente.email || '', note, data: giorno, ini: ora, fine: ora + dur, dur, staff: st.id, staffNome: st.nome,
    servizi: scelti().map(s => ({ id: s.id, nome: s.nome, prezzo: s.prezzo, durata: s.durata })), prezzo: prezzoTot(), stato: 'ok', orig: (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ? 'app' : 'web', creata: Date.now() };
  try {
    const w = writeBatch(db);
    w.set(doc(colP, id), rec); w.set(doc(colB, id), { data: giorno, ini: ora, fine: ora + dur, staff: st.id });
    w.set(doc(db, 'saloni', SALONE, 'clienti', utente.uid), { nome: n, cogn: c, tel: t, mail: utente.email || '' }, { merge: true });
    await w.commit();
  } catch (x) { b.classList.remove('load'); return E('Prenotazione non riuscita. Controlla la connessione e riprova.'); }
  b.classList.remove('load'); PROF = Object.assign(PROF || {}, { nome: n, cogn: c, tel: t });
  $('okTxt').textContent = `Ti aspetto ${dataLunga(giorno)} alle ${hm(ora)}.`;
  $('okCal').href = gcal(rec);
  sel = []; ora = null; giorno = null; staffSel = 'any'; $('fNote').value = '';
  STORIA = ['ph']; vai('p5'); setTimeout(proponiNotifiche, 900);
};
function gcal(b) {
  const dt = (k, m) => k.replace(/-/g, '') + 'T' + p2(Math.floor(m / 60)) + p2(m % 60) + '00';
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(C.nome + ' – ' + b.servizi.map(s => s.nome).join(', ')) + '&dates=' + dt(b.data, b.ini) + '/' + dt(b.data, b.fine) + '&ctz=Europe%2FRome&details=' + encodeURIComponent('Appuntamento prenotato con l’app') + (C.indirizzo ? '&location=' + encodeURIComponent(C.indirizzo) : '');
}

/* ---------- richiesta (servizi "su richiesta": trucco sposa e cerimonia): niente orario, la titolare ricontatta ---------- */
let RIC = [], unsubRic = null;
function renderRichiesta() {
  const sv = scelti()[0]; if (!sv) { mostraP('p1'); return; }
  $('qSv').innerHTML = `<b>${esc(sv.nome)}</b>${sv.descr ? `<small>${esc(sv.descr)}</small>` : ''}`;
  $('qLogin').hidden = !!utente; $('qDati').hidden = !utente; $('qErr').textContent = '';
  if (utente) { const p = PROF || {}; if (!$('qNome').value) $('qNome').value = p.nome || ''; if (!$('qCogn').value) $('qCogn').value = p.cogn || ''; if (!$('qTel').value) $('qTel').value = p.tel || ''; }
  $('qData').min = oggi();
}
$('qAccedi').onclick = () => apriLogin();
$('qInvia').onclick = async () => {
  const b = $('qInvia'), E = t => { $('qErr').textContent = t; }, sv = scelti()[0]; if (!sv) return;
  const n = $('qNome').value.trim(), c = $('qCogn').value.trim(), t = $('qTel').value.trim(), note = $('qNote').value.trim(), de = $('qData').value;
  if (!n || !c) return E('Inserisci nome e cognome.');
  if (t.replace(/\D/g, '').length < 6) return E('Inserisci un numero di telefono: ti ricontatto lì.');
  if (RIC.filter(r => r.stato === 'nuova').length >= 3) return E('Hai già 3 richieste in attesa: aspetta una risposta o annullane una.');
  b.classList.add('load');
  const id = 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const rec = { id, uid: utente.uid, nome: n, cogn: c, tel: t, mail: utente.email || '', note, dataEvento: de || '', servizio: { id: sv.id, nome: sv.nome, durata: sv.durata, prezzo: sv.prezzo || '' }, stato: 'nuova', creata: Date.now(), orig: APP ? 'app' : 'web' };
  try { const w = writeBatch(db); w.set(doc(colQ, id), rec); w.set(doc(db, 'saloni', SALONE, 'clienti', utente.uid), { nome: n, cogn: c, tel: t, mail: utente.email || '' }, { merge: true }); await w.commit(); }
  catch (x) { b.classList.remove('load'); return E('Invio non riuscito. Controlla la connessione e riprova.'); }
  b.classList.remove('load'); PROF = Object.assign(PROF || {}, { nome: n, cogn: c, tel: t });
  sel = []; $('qNote').value = ''; $('qData').value = '';
  STORIA = ['ph']; vai('pm');
  await dialogo('Richiesta inviata', 'Ti ricontatto al più presto per fissare l’appuntamento. La trovi qui, in Prenotazioni.', 'Ok');
};
function legaRichieste() {
  $('mList').querySelectorAll('[data-xq]').forEach(k => k.onclick = async () => {
    if (!await dialogo('Annullare la richiesta?', '', 'Sì, annulla', 'No')) return;
    try { await setDoc(doc(colQ, k.dataset.xq), { stato: 'annullata', annullataIl: Date.now() }, { merge: true }); toast('Richiesta annullata'); } catch (x) { avvisa('Non riesco ad annullare. Riprova.'); }
  });
}

/* ---------- le mie prenotazioni ---------- */
const attiva = b => b.stato !== 'annullata' && (b.data > oggi() || (b.data === oggi() && b.ini > oraMin()));
/* quanto prima si può annullare: la regola generale, oppure quella del trattamento se è più lunga (es. trucchi: 7 giorni) */
const limiteAnnullo = b => Math.max(C.regole.annulloMin || 0, ...(b.servizi || []).map(x => { const s = serv(x.id) || {}; const g = +s.annulloGiorni || (s.richiesta ? 7 : 0); return g * 1440; }));
const minutiA = b => (new Date(b.data + 'T00:00').getTime() + b.ini * 60000 - Date.now()) / 60000;
function renderMie() {
  $('mFut').style.opacity = storico ? .6 : 1; $('mSto').style.opacity = storico ? 1 : .6;
  if (!mieOk) { $('mList').innerHTML = '<div class="spin"></div>'; return; }
  const l = MIE.filter(b => storico ? !attiva(b) : attiva(b)).sort((a, b) => (a.data + p2(a.ini)).localeCompare(b.data + p2(b.ini)) * (storico ? -1 : 1));
  /* richieste (trucco sposa, cerimonia): quelle aperte e quelle a cui la titolare ha risposto da poco */
  const da14 = Date.now() - 14 * 864e5, stR = r => { const b = r.pren && MIE.find(x => x.id === r.pren); return r.stato === 'fissata' && b && b.stato === 'annullata' ? 'annullata' : r.stato; };
  const R = storico ? [] : RIC.filter(r => stR(r) === 'nuova' || (['fissata', 'rifiutata'].includes(stR(r)) && (r.rispostaIl || 0) > da14) || (stR(r) === 'annullata' && r.annullataDa === 'salone' && (r.annullataIl || 0) > da14)).sort((a, b) => b.creata - a.creata);
  const STQ = { nuova: ['In attesa di risposta', 'var(--gold)'], fissata: ['Appuntamento fissato', 'var(--ok)'], rifiutata: ['Non disponibile', 'var(--wait)'], annullata: ['Annullato dal salone', 'var(--wait)'] };
  const htmlR = R.map(r => `<div class="row rq"><b>${esc(r.servizio && r.servizio.nome || 'Richiesta')}</b><small>${r.dataEvento ? 'Per ' + esc(dataLunga(r.dataEvento)) + ' · ' : ''}inviata il ${new Date(r.creata).toLocaleDateString('it-IT')}</small>
     <span class="rqst" style="color:${STQ[stR(r)][1]}">● ${STQ[stR(r)][0]}</span>${r.risposta ? `<small class="rqmsg">${esc(r.risposta)}</small>` : ''}${stR(r) === 'nuova' ? `<button class="x" data-xq="${esc(r.id)}" aria-label="Annulla la richiesta">✕</button>` : ''}</div>`).join('');
  if (!l.length) { $('mList').innerHTML = htmlR + `<p class="vuoto">${storico ? 'Nessuna prenotazione passata.' : 'Non hai prenotazioni in programma.'}</p>` + (storico ? '' : '<button class="cta" data-go="p1">Prenota ora</button>'); legaRichieste(); return; }
  $('mList').innerHTML = htmlR + l.map(b => { const d = new Date(b.data + 'T12:00'), st = C.staff.find(s => s.id === b.staff) || { nome: b.staffNome };
    return `<div class="bk${b.stato === 'annullata' ? ' ann' : ''}"><div class="dt"><i>${d.toLocaleDateString('it-IT', { month: 'short' })}</i><span>${d.toLocaleDateString('it-IT', { weekday: 'short' })}</span><b>${d.getDate()}</b><em>${hm(b.ini)}</em></div>
     <div class="bd">${C.staff.length > 1 ? `<div class="who">${avatar(st)}${esc(st.nome)}</div>` : ''}${b.servizi.map(s => `<span class="chip">${esc(s.nome)}</span>`).join('')}${b.stato === 'annullata' ? '<small style="display:block;margin-top:6px;color:var(--wait)">Annullata</small>' : ''}
     ${!storico ? `<button class="x" data-x="${b.id}" aria-label="Annulla">✕</button>` : ''}</div></div>`; }).join('');
  legaRichieste();
  $('mList').querySelectorAll('[data-x]').forEach(k => k.onclick = async () => {
    const b = MIE.find(z => z.id === k.dataset.x); if (!b) return;
    const lim = limiteAnnullo(b);
    if (minutiA(b) < lim) { avvisa('Si può annullare dall’app fino a ' + (lim % 1440 === 0 ? lim / 1440 + (lim === 1440 ? ' giorno' : ' giorni') : fd(lim)) + ' prima dell’appuntamento. Per annullarlo ora contatta ' + C.nome + '.'); return; }
    if (!await dialogo('Annullare la prenotazione?', dataLunga(b.data) + ' alle ' + hm(b.ini), 'Sì, annulla', 'No')) return;
    try { const w = writeBatch(db); w.update(doc(colP, b.id), { stato: 'annullata', annullataIl: Date.now(), annullataDa: 'cliente' }); w.delete(doc(colB, b.id)); await w.commit(); toast('Prenotazione annullata'); }
    catch (x) { avvisa('Non riesco ad annullare. Controlla la connessione e riprova.'); }
  });
}
$('mFut').onclick = () => { storico = false; renderMie(); };
$('mSto').onclick = () => { storico = true; renderMie(); };

/* ---------- profilo ---------- */
/* Testi legali: segnaposto riempiti con i dati del negozio, righe '## ' come titoli, '- ' come elenchi */
function testoLegale(t) {
  return window.compilaLegale(t, C).split('\n').map(r => r.trim()).filter(Boolean).map(r =>
    r.startsWith('## ') ? `<h3>${esc(r.slice(3))}</h3>` : r.startsWith('- ') ? `<p class="li">${esc(r.slice(2))}</p>` : `<p>${esc(r)}</p>`).join('');
}
/* ---------- Fidelity Card: saldo punti, premio successivo, catalogo, movimenti ---------- */
const fidCfg = () => Object.assign(cp(window.RADICI_SEED.fidelity), C.fidelity || {});
const TIPIF = { visita: 'Visita', bonus: 'Bonus', premio: 'Premio ritirato', rettifica: 'Correzione' };
function renderFid() {
  const f = fidCfg(), el = $('fCard');
  if (!f.attiva) { el.innerHTML = '<div class="row"><b>In arrivo</b><small>Presto potrai raccogliere punti a ogni visita e ottenere premi.</small></div>'; return; }
  const regBtn = '<button class="cta sec" data-go="pr">Leggi il regolamento</button>';
  if (!utente) { el.innerHTML = `<div class="row"><b>Raccogli punti a ogni visita</b><small>La Fidelity Card è riservata ai clienti registrati nell’app: accedi per vedere i tuoi punti e i premi.</small></div><button class="cta" id="fAcc">Accedi</button>${regBtn}`; $('fAcc').onclick = apriLogin; return; }
  if (!fidOk) { el.innerHTML = '<div class="spin"></div>'; return; }
  const s = window.FID.saldo(FMIE, f, oggi()), premi = (f.premi || []).slice().sort((a, b) => a.punti - b.punti);
  const prossimo = premi.find(p => p.punti > s.saldo), pronti = premi.filter(p => p.punti <= s.saldo);
  const nome = PROF && (PROF.nome || PROF.cogn) ? (PROF.nome + ' ' + (PROF.cogn || '')).trim() : (utente.displayName || '');
  const M = FMIE.slice().sort((a, b) => (b.data + (b.ts || 0)).localeCompare(a.data + (a.ts || 0))).slice(0, 30);
  el.innerHTML = `<div class="fcard"><svg viewBox="0 0 200 120" preserveAspectRatio="xMaxYMax slice" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round"><path d="M150 0c2 30-6 50-24 66s-26 34-24 54"/><path d="M150 0c4 28 18 44 34 56s16 40 12 64" stroke-width=".8"/><path d="M126 66c-14 4-28 14-34 30" stroke-width=".8"/><path d="M168 30c10 8 20 10 32 8" stroke-width=".6"/><path d="M110 92c8 6 12 16 12 28" stroke-width=".6"/></g></svg>
     <div class="fc-top"><span>Fidelity Card</span><b>${esc(C.nome)}</b></div><div class="fc-pt"><b>${s.saldo}</b><span>${s.saldo === 1 ? 'punto' : 'punti'}</span></div><div class="fc-nome">${esc(nome)}</div></div>
   ${prossimo ? `<div class="row fprog"><small>Ti mancano <b>${prossimo.punti - s.saldo} punti</b> per</small><b>${esc(prossimo.nome)}</b><div class="fbar"><i style="width:${Math.min(100, s.saldo / prossimo.punti * 100)}%"></i></div></div>` : ''}
   ${pronti.length ? `<div class="row fok"><b>🎁 Puoi già richiedere in salone</b><small>${pronti.map(p => esc(p.nome)).join(' · ')}</small></div>` : ''}
   ${s.scadenza.punti ? `<p class="hint">${s.scadenza.punti} punti scadono il ${new Date(s.scadenza.data + 'T12:00').toLocaleDateString('it-IT')}: usali prima!</p>` : ''}
   <h3 class="fh">Catalogo premi</h3><div class="row">${premi.map(p => `<div class="fpr${p.punti <= s.saldo ? ' ok' : ''}"><span>${p.punti}</span><b>${esc(p.nome)}</b>${p.punti <= s.saldo ? '<i>✓</i>' : ''}</div>`).join('')}</div>
   ${regBtn}
   <h3 class="fh">I tuoi movimenti</h3>${M.length ? `<div class="row">${M.map(m => `<div class="fmv"><div><b>${TIPIF[m.tipo] || ''}</b><small>${new Date(m.data + 'T12:00').toLocaleDateString('it-IT')}${m.nota ? ' · ' + esc(m.nota) : ''}</small></div><span class="${m.punti < 0 ? 'meno' : ''}">${m.punti > 0 ? '+' : ''}${m.punti}</span></div>`).join('')}</div>` : '<p class="vuoto">Ancora nessun punto: li ricevi dopo ogni appuntamento in salone.</p>'}`;
}
const renderReg = () => { $('tReg').innerHTML = window.FID.html(fidCfg(), C, esc); };
const aggLegali = () => { $('tPriv').innerHTML = testoLegale(C.privacy || window.RADICI_SEED.privacy); $('tTerm').innerHTML = testoLegale(C.termini || window.RADICI_SEED.termini); };
function renderProfilo() {
  ['pMod', 'pDel', 'pOut'].forEach(id => $(id).hidden = !utente); $('pIn').hidden = !!utente; $('pBenv').hidden = !!utente; document.querySelector('.pfoto').style.pointerEvents = utente ? '' : 'none'; document.querySelector('.pfoto .cam').hidden = !utente;
  const n = PROF && (PROF.nome || PROF.cogn) ? (PROF.nome + ' ' + PROF.cogn).trim() : (utente && utente.displayName) || (utente ? 'Cliente' : 'Benvenuto');
  const foto = (PROF && PROF.foto) || (utente && utente.photoURL) || '';
  $('pAv').innerHTML = foto ? `<img src="${esc(foto)}" alt="" referrerpolicy="no-referrer">` : esc(iniziali(n)); $('pNome').textContent = n; $('pMail').textContent = utente ? utente.email || '' : ''; $('pVer').textContent = VERSIONE;
  if (!utente) $('pAv').innerHTML = C.logo ? `<img src="${esc(C.logo)}" alt="">` : esc(iniziali(C.nome)[0]);
  $('tPriv').innerHTML = testoLegale(C.privacy || window.RADICI_SEED.privacy); $('tTerm').innerHTML = testoLegale(C.termini || window.RADICI_SEED.termini);
  aggNotifiche();
}
/* foto del profilo: rimpicciolita sul telefono e salvata con i dati del cliente */
function riduci(file, lato) { return new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const s = Math.min(1, lato / Math.min(im.width, im.height)), c = document.createElement('canvas'), w = Math.round(im.width * s), h = Math.round(im.height * s), q = Math.min(w, h); c.width = c.height = q; c.getContext('2d').drawImage(im, (q - w) / 2, (q - h) / 2, w, h); ok(c.toDataURL('image/jpeg', .82)); }; im.onerror = ko; im.src = r.result; }; r.onerror = ko; r.readAsDataURL(file); }); }
$('pFile').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f || !utente) return;
  if (PROF && PROF.foto && !await dialogo('Foto del profilo', 'Vuoi sostituire la foto attuale?', 'Sostituisci', 'Togli la foto')) {
    try { await setDoc(doc(db, 'saloni', SALONE, 'clienti', utente.uid), { foto: '' }, { merge: true }); PROF.foto = ''; renderProfilo(); toast('Foto tolta'); } catch (x) { avvisa('Non riuscito. Riprova.'); } return;
  }
  try { const foto = await riduci(f, 256); await setDoc(doc(db, 'saloni', SALONE, 'clienti', utente.uid), { foto }, { merge: true }); PROF = Object.assign(PROF || {}, { foto }); renderProfilo(); toast('Foto aggiornata'); }
  catch (x) { avvisa('Non riesco a caricare la foto. Prova con un’altra immagine.'); }
};
$('pMod').onclick = () => { const p = PROF || {}; $('eNome').value = p.nome || ''; $('eCogn').value = p.cogn || ''; $('eTel').value = p.tel || ''; $('eErr').textContent = ''; $('prof').hidden = false; };
$('eNo').onclick = () => { $('prof').hidden = true; };
$('eOk').onclick = async () => {
  const d = { nome: $('eNome').value.trim(), cogn: $('eCogn').value.trim(), tel: $('eTel').value.trim(), mail: utente.email || '' };
  if (!d.nome || !d.cogn) { $('eErr').textContent = 'Inserisci nome e cognome.'; return; }
  try { await setDoc(doc(db, 'saloni', SALONE, 'clienti', utente.uid), d, { merge: true }); PROF = d; $('prof').hidden = true; renderProfilo(); toast('Dati salvati'); }
  catch (x) { $('eErr').textContent = 'Salvataggio non riuscito. Riprova.'; }
};
$('pIn').onclick = () => apriLogin();
$('pOut').onclick = () => togliDispositivo().then(() => { fineTitolare(); return signOut(auth); }).then(() => { STORIA = ['ph']; mostraP('ph'); });
$('pDel').onclick = async () => {
  if (!await dialogo('Cancellare il profilo?', 'Le prenotazioni in programma verranno annullate e i tuoi dati cancellati. Non si può tornare indietro.', 'Sì, cancella', 'No')) return;
  try {
    const w = writeBatch(db);
    MIE.filter(attiva).forEach(b => { w.update(doc(colP, b.id), { stato: 'annullata', annullataIl: Date.now(), annullataDa: 'cliente' }); w.delete(doc(colB, b.id)); });
    w.delete(doc(db, 'saloni', SALONE, 'clienti', utente.uid)); await w.commit();
    await deleteUser(auth.currentUser); toast('Profilo cancellato'); STORIA = ['ph']; mostraP('ph');
  } catch (x) { avvisa(x && x.code === 'auth/requires-recent-login' ? 'Per sicurezza esci, accedi di nuovo e riprova a cancellare il profilo.' : 'Cancellazione non riuscita. Riprova.'); }
};

/* ---------- accesso ---------- */
function apriLogin() { $('lErr').textContent = ''; $('login').hidden = false; }
/* Termini e privacy: vanno accettati prima di accedere o registrarsi; l'accettazione si salva con data e ora */
try { $('lOk').checked = localStorage.getItem('nmConsenso') === '1'; } catch (e) {}
$('lOk').onchange = () => { try { localStorage.setItem('nmConsenso', $('lOk').checked ? '1' : '0'); } catch (e) {} };
let consensoDaSalvare = false;
async function consenso() {
  if ($('lOk').checked) { consensoDaSalvare = true; return true; }
  const c = document.querySelector('.consenso'); c.classList.remove('scuoti'); void c.offsetWidth; c.classList.add('scuoti');
  await dialogo('Attenzione', 'Prima di poter proseguire devi dichiarare di aver preso visione dei termini del servizio e della privacy policy.', 'Ok');
  return false;
}
document.querySelectorAll('[data-leggi]').forEach(a => a.onclick = e => { e.preventDefault(); $('login').hidden = true; vai(a.dataset.leggi); });
$('lX').onclick = () => { $('login').hidden = true; };
$('cBtn').onclick = () => utente ? signOut(auth) : apriLogin();
const errAuth = e => ({ 'auth/invalid-credential': 'Email o password non corretti.', 'auth/wrong-password': 'Email o password non corretti.', 'auth/user-not-found': 'Email o password non corretti.', 'auth/invalid-email': 'Controlla l’indirizzo email.', 'auth/email-already-in-use': 'Esiste già un account con questa email: accedi.', 'auth/weak-password': 'La password deve avere almeno 6 caratteri.', 'auth/too-many-requests': 'Troppi tentativi: riprova tra qualche minuto.', 'auth/network-request-failed': 'Controlla la connessione e riprova.' })[e && e.code] || 'Operazione non riuscita. Riprova.';
/* Google: nell'app Android con la scelta dell'account del telefono, sul sito con la finestra di Google */
const FA = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins ? window.Capacitor.Plugins.FirebaseAuthentication : null;
$('lGoogle').onclick = async () => { if (!await consenso()) return; try { if (FA) { const r = await FA.signInWithGoogle(); await signInWithCredential(auth, GoogleAuthProvider.credential(r.credential && r.credential.idToken)); } else await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { if (/popup-closed|cancelled-popup/.test(e.code) || /cancel/i.test(String(e && e.message))) return; $('lErr').textContent = FA ? 'Accesso con Google non riuscito (' + (e.code || e.message || 'errore') + ').' : errAuth(e); } };
$('lIn').onclick = async () => { if (!await consenso()) return; const m = $('lMail').value.trim(), p = $('lPass').value; if (!m || !p) { $('lErr').textContent = 'Inserisci email e password.'; return; } try { await signInWithEmailAndPassword(auth, m, p); } catch (e) { $('lErr').textContent = errAuth(e); } };
$('lReg').onclick = async () => { if (!await consenso()) return; const m = $('lMail').value.trim(), p = $('lPass').value; if (!/^\S+@\S+\.\S+$/.test(m)) { $('lErr').textContent = 'Inserisci un’email valida.'; return; } if (p.length < 6) { $('lErr').textContent = 'Scegli una password di almeno 6 caratteri.'; return; } try { const c = await createUserWithEmailAndPassword(auth, m, p); sendEmailVerification(c.user).catch(() => {}); } catch (e) { $('lErr').textContent = errAuth(e); } };
$('lRes').onclick = async () => { const m = $('lMail').value.trim(); if (!/^\S+@\S+\.\S+$/.test(m)) { $('lErr').textContent = 'Scrivi la tua email, poi tocca “Password dimenticata?”.'; return; } try { await sendPasswordResetEmail(auth, m); } catch (e) {} $('lErr').textContent = 'Se l’email è registrata, ti abbiamo inviato un link per scegliere una nuova password.'; };

let unsubMie = null, unsubFid = null, FMIE = [], fidOk = false;
onAuthStateChanged(auth, async u => {
  utente = u; PROF = null; MIE = []; mieOk = false;
  if (unsubMie) { unsubMie(); unsubMie = null; }
  if (unsubRic) { unsubRic(); unsubRic = null; } RIC = [];
  if (unsubFid) { unsubFid(); unsubFid = null; } FMIE = []; fidOk = false;
  if (u) {
    $('login').hidden = true;
    try { const d = await getDoc(doc(db, 'saloni', SALONE, 'clienti', u.uid)); if (d.exists()) PROF = d.data(); } catch (e) {}
    if (!PROF && u.displayName) { const p = u.displayName.split(' '); PROF = { nome: p[0], cogn: p.slice(1).join(' '), tel: '' }; }
    setTimeout(() => { if (!PROF || PROF.notifiche !== false) attivaPush(false); }, 1500);
    controllaTitolare(u);
    unsubRic = onSnapshot(query(colQ, where('uid', '==', u.uid)), s => { RIC = s.docs.map(d => d.data()); if (PAG === 'pm') renderMie(); if (PAG === 'pq') renderRichiesta(); }, () => {});
    unsubFid = onSnapshot(query(colF, where('uid', '==', u.uid)), s => { FMIE = s.docs.map(d => d.data()); fidOk = true; if (PAG === 'pf') renderFid(); }, () => { fidOk = true; if (PAG === 'pf') renderFid(); });
    unsubMie = onSnapshot(query(colP, where('uid', '==', u.uid)), s => { MIE = s.docs.map(d => d.data()); mieOk = true; promemoriaLocali(); if (PAG === 'pm' || PAG === 'ph') mostraP(PAG); }, () => { mieOk = true; });
  } else if (PAG === 'pm') { STORIA = ['ph']; }
  if (u && consensoDaSalvare) { consensoDaSalvare = false; setDoc(doc(db, 'saloni', SALONE, 'clienti', u.uid), { consenso: { termini: true, privacy: true, data: Date.now() } }, { merge: true }).catch(() => {}); }
  renderTesta(); mostraP(PAG === 'pm' ? (u ? PAG : 'ph') : PAG);
  prAuth = true; prova();
});

/* ---------- solo nell'app Android: tasto Indietro, Google non disponibile, avviso di nuova versione ---------- */
const APP = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
if (APP) {
  document.documentElement.classList.add('in-app');
  if (!FA) { $('lGoogle').hidden = true; $('lOpp').hidden = true; } // l'accesso con Google dentro l'app richiede la configurazione del nuovo progetto Firebase
  const N = window.Capacitor.Plugins || {};
  if (N.App) N.App.addListener('backButton', () => {
    if (!$('viewer').hidden) { history.back(); return; }
    for (const id of ['dlg', 'prof', 'login']) if (!$(id).hidden) { if (id === 'dlg') ($('dlgNo').hidden ? $('dlgOk') : $('dlgNo')).click(); else $(id).hidden = true; return; }
    if (PAG !== 'ph') { indietro(); return; }
    N.App.exitApp();
  });
  (async () => {
    const REPO = 'salvatorefiumesas-bit/Nailendmakeup', AGG = N.Aggiorna;
    let mia = 0; try { mia = (await (await fetch('versione.json', { cache: 'no-store' })).json()).v || 0; } catch (e) { return; }
    if (!mia) return;
    let aperto = false;
    const controlla = async () => {
      if (aperto) return;
      try {
        const r = await fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { cache: 'no-store' }); if (!r.ok) return;
        const n = Number((String((await r.json()).tag_name).match(/^app-v1\.(\d+)$/) || [])[1] || 0);
        let no = ''; try { no = sessionStorage.getItem('aggNo') || ''; } catch (e) {}
        if (!(n > mia) || no === String(n)) return;
        aperto = true;
        const url = 'https://github.com/' + REPO + '/releases/download/app-v1.' + n + '/NailsMakeup.apk';
        if (!await dialogo('Nuova versione disponibile', 'È uscita la versione 1.' + n + ' dell’app (tu hai la 1.' + mia + '). Tocca “Aggiorna”: l’app la scarica da sola, poi conferma nella schermata di Android. I tuoi dati restano.', 'Aggiorna', 'Più tardi')) { try { sessionStorage.setItem('aggNo', String(n)); } catch (e) {} aperto = false; return; }
        if (!AGG) { location.href = url; aperto = false; return; }
        if (!(await AGG.puoInstallare()).ok) {
          if (!await dialogo('Un permesso, una volta sola', 'Android chiede di consentire a questa app di installare gli aggiornamenti. Nella schermata che si apre attiva “Consenti da questa fonte”, poi torna indietro.', 'Apri impostazioni', 'Annulla')) { aperto = false; return; }
          await AGG.apriPermesso();
          await new Promise(ok => { const f = () => { if (document.visibilityState === 'visible') { document.removeEventListener('visibilitychange', f); ok(); } }; document.addEventListener('visibilitychange', f); });
          if (!(await AGG.puoInstallare()).ok) { await avvisa('Senza quel permesso l’aggiornamento non si può installare. Riprova la prossima volta che apri l’app.'); aperto = false; return; }
        }
        $('dlgT').textContent = 'Scarico l’aggiornamento…'; $('dlgP').textContent = '0%'; $('dlgOk').hidden = true; $('dlgNo').hidden = true; $('dlg').hidden = false;
        const h = await AGG.addListener('progresso', e => { $('dlgP').textContent = e.p + '%'; });
        try { await AGG.installa({ url }); } catch (e) { $('dlg').hidden = true; $('dlgOk').hidden = false; await avvisa('Aggiornamento non riuscito (' + (e && e.message || e) + '). Riprova.'); }
        finally { h.remove(); $('dlg').hidden = true; $('dlgOk').hidden = false; aperto = false; }
      } catch (e) { aperto = false; }
    };
    setTimeout(controlla, 3500);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') controlla(); });
  })();
}
window.riempiIcone(); try { history.replaceState({ r: 1 }, ''); } catch (e) {}
mostraP('ph');
if (!APP && 'serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));

/* ---------- notifiche push (app Android): promemoria degli appuntamenti e messaggi del salone.
   Le invia il server (Firebase Cloud Functions) secondo quanto deciso nella dashboard → Notifiche push.
   Qui l'app chiede il permesso, registra il telefono del cliente e apre la pagina giusta quando si tocca la notifica. ---------- */
var PUSH = APP && window.Capacitor.Plugins ? window.Capacitor.Plugins.FirebaseMessaging || null : null;
var pushToken = '';
async function salvaDispositivo(t) {
  if (!utente || !t) return; pushToken = t;
  const l = ((PROF && PROF.dispositivi) || []).filter(d => d.token !== t).slice(-4).concat({ token: t, os: 'android', agg: Date.now() });
  try { await setDoc(doc(db, 'saloni', SALONE, 'clienti', utente.uid), { dispositivi: l, notifiche: true }, { merge: true }); PROF = Object.assign(PROF || {}, { dispositivi: l, notifiche: true }); } catch (e) {}
}
async function togliDispositivo(spegni) {
  if (!PUSH || !utente || !pushToken) return;
  const l = ((PROF && PROF.dispositivi) || []).filter(d => d.token !== pushToken), d = { dispositivi: l }; if (spegni) d.notifiche = false;
  try { await setDoc(doc(db, 'saloni', SALONE, 'clienti', utente.uid), d, { merge: true }); PROF = Object.assign(PROF || {}, d); } catch (e) {}
}
/* chiedi=true mostra la richiesta di Android; false aggiorna solo il codice del telefono se il permesso c'è già */
async function attivaPush(chiedi) {
  if (!PUSH || !utente) return 'nd';
  try {
    let p = (await PUSH.checkPermissions()).receive;
    if (p !== 'granted' && chiedi) p = (await PUSH.requestPermissions()).receive;
    if (p !== 'granted') return p === 'denied' ? 'negato' : 'no';
    const r = await PUSH.getToken(); await salvaDispositivo(r.token); promemoriaLocali(); return 'si';
  } catch (e) { return 'errore'; }
}
function aggNotifiche() {
  const b = $('pNot'); if (!b) return; b.hidden = !PUSH || !utente; if (b.hidden) return;
  $('pNotT').textContent = 'Notifiche: ' + (PROF && PROF.notifiche ? 'attive' : 'disattivate');
}
if ($('pNot')) $('pNot').onclick = async () => {
  if (PROF && PROF.notifiche) { await togliDispositivo(true); if (!pushToken) { try { await setDoc(doc(db, 'saloni', SALONE, 'clienti', utente.uid), { notifiche: false }, { merge: true }); } catch (e) {} PROF = Object.assign(PROF || {}, { notifiche: false }); } promemoriaLocali(); aggNotifiche(); toast('Notifiche disattivate'); return; }
  const r = await attivaPush(true); aggNotifiche();
  if (r === 'si') toast('Notifiche attive');
  else if (r === 'negato') avvisa('Le notifiche sono bloccate nelle impostazioni del telefono. Per attivarle: Impostazioni → App → ' + C.nome + ' → Notifiche.');
  else if (r === 'errore') avvisa('Non è stato possibile attivare le notifiche. Riprova più tardi.');
};
/* dopo la prima prenotazione: chiedo una volta sola se vuole i promemoria */
async function proponiNotifiche() {
  if (!PUSH || !utente || (PROF && PROF.notifiche !== undefined)) return;
  const ok = await dialogo('Vuoi un promemoria?', 'Ti avvisiamo con una notifica prima dell’appuntamento. Puoi cambiare idea quando vuoi dal Profilo.', 'Sì, avvisami', 'No, grazie');
  if (ok) { const r = await attivaPush(true); if (r === 'si') toast('Perfetto, ti avviseremo'); aggNotifiche(); }
  else { try { await setDoc(doc(db, 'saloni', SALONE, 'clienti', utente.uid), { notifiche: false }, { merge: true }); PROF = Object.assign(PROF || {}, { notifiche: false }); } catch (e) {} aggNotifiche(); }
}
if (PUSH) {
  PUSH.createChannel({ id: 'promemoria', name: 'Promemoria appuntamenti', description: 'Avvisi prima dei tuoi appuntamenti', importance: 4, visibility: 1, vibration: true }).catch(() => {});
  PUSH.createChannel({ id: 'salone', name: 'Comunicazioni del salone', description: 'Novità, punti fedeltà e messaggi del salone', importance: 3, visibility: 1 }).catch(() => {});
  PUSH.addListener('tokenReceived', e => { if (utente && PROF && PROF.notifiche) salvaDispositivo(e.token); });
  /* con l'app aperta Android non mostra la notifica: la faccio vedere io */
  PUSH.addListener('notificationReceived', e => { const n = e.notification || {}; if (n.title || n.body) toast((n.title ? n.title + ' – ' : '') + (n.body || '')); });
  PUSH.addListener('notificationActionPerformed', e => { const d = (e.notification && e.notification.data) || {}; if (['pm', 'pa', 'pf', 'ph', 'p1', 'pi'].includes(d.pagina)) setTimeout(() => vai(d.pagina), 700); });
}

/* ---------- promemoria sul telefono (notifiche locali, funzionano anche senza server) ----------
   Usano gli stessi tempi e testi decisi nella dashboard → Notifiche push. Quando l'invio dal server sarà attivo
   (notifiche.server = true) si spengono, per non ricevere doppioni.
   Per la titolare: la sera prima alle 21:00 il riepilogo degli appuntamenti del giorno dopo, come nella vecchia app. */
var LN = APP && window.Capacitor.Plugins ? window.Capacitor.Plugins.LocalNotifications || null : null;
var lnT = null, titolare = false, TUTTE = [], unsubTutte = null;
async function controllaTitolare(u) {
  titolare = false;
  try { titolare = (await getDoc(doc(db, 'saloni', SALONE, 'admin', u.uid))).exists(); } catch (e) {}
  if (!titolare || !LN) return;
  try { const p = await LN.checkPermissions(); if (p.display !== 'granted') await LN.requestPermissions(); } catch (e) {}
  if (unsubTutte) unsubTutte();
  unsubTutte = onSnapshot(colP, s => { TUTTE = s.docs.map(d => d.data()); promemoriaLocali(); }, () => {});
}
function fineTitolare() { titolare = false; TUTTE = []; if (unsubTutte) { unsubTutte(); unsubTutte = null; } if (LN) LN.getPending().then(p => p.notifications && p.notifications.length && LN.cancel({ notifications: p.notifications.map(n => ({ id: n.id })) })).catch(() => {}); }
function promemoriaLocali() {
  if (!LN) return; clearTimeout(lnT);
  lnT = setTimeout(async () => {
    const N = Object.assign(cp(window.RADICI_SEED.notifiche), C.notifiche || {}), L = [], adesso = Date.now(), oggiK = oggi();
    const inizio = b => new Date(b.data + 'T00:00').getTime() + b.ini * 60000;
    const quando = (b, at) => { const g = new Date(at), k = iso(g), dom = new Date(at + 864e5); return (b.data === k ? 'oggi' : b.data === iso(dom) ? 'domani' : dataLunga(b.data)) + ' alle ' + hm(b.ini); };
    if (!N.server && utente && PROF && PROF.notifiche) {
      MIE.filter(b => b.stato !== 'annullata' && b.data >= oggiK).forEach(b => (N.promemoria || []).filter(r => r.attivo).forEach(r => {
        const at = inizio(b) - r.prima * 60000; if (at <= adesso) return;
        const v = { nome: (PROF && PROF.nome) || b.nome, quando: quando(b, at), ora: hm(b.ini), giorno: dataLunga(b.data), servizi: b.servizi.map(x => x.nome).join(', '), operatore: b.staffNome || '', salone: C.nome };
        L.push({ t: window.testoNotifica(r.titolo, v) || C.nome, b: window.testoNotifica(r.testo, v), at, canale: 'promemoria' });
      }));
    }
    if (titolare) {
      const G = {}; TUTTE.forEach(b => { if (b.stato !== 'annullata' && b.data > oggiK) (G[b.data] = G[b.data] || []).push(b); });
      Object.keys(G).sort().forEach(k => { const [y, m, d] = k.split('-').map(Number), at = new Date(y, m - 1, d - 1, 21, 0).getTime(); if (at <= adesso) return;
        const l = G[k].sort((a, b) => a.ini - b.ini);
        L.push({ t: 'Domani: ' + l.length + (l.length === 1 ? ' appuntamento' : ' appuntamenti'), b: l.map(x => hm(x.ini) + ' ' + x.nome + ' ' + (x.cogn || '') + ' – ' + x.servizi.map(z => z.nome).join(', ')).join('\n'), at, canale: 'salone' }); });
    }
    try {
      const p = await LN.getPending(); if (p.notifications && p.notifications.length) await LN.cancel({ notifications: p.notifications.map(n => ({ id: n.id })) });
      if (!L.length || (await LN.checkPermissions()).display !== 'granted') return;
      await LN.schedule({ notifications: L.sort((a, b) => a.at - b.at).slice(0, 60).map((x, i) => ({ id: i + 1, title: x.t, body: x.b, largeBody: x.b, channelId: x.canale, smallIcon: 'ic_stat_nm', schedule: { at: new Date(x.at), allowWhileIdle: true }, extra: { pagina: 'pm' } })) });
    } catch (e) { console.error('promemoria', e); }
  }, 800);
}
if (LN) LN.addListener('localNotificationActionPerformed', e => { const d = (e.notification && e.notification.extra) || {}; if (d.pagina) setTimeout(() => vai(d.pagina), 700); });
