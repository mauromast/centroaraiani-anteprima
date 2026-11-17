/* Centro Diagnostico Ara Iani — script principale (nessuna dipendenza) */
(function () {
  'use strict';
  var GA_ID = window.ARA_GA_ID || '';
  var CONSENT_KEY = 'araiani_consenso_v1';

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- Google Analytics 4 con Consent Mode v2 (modalità base) ---------- */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  var gaLoaded = false;
  function loadGA() {
    if (gaLoaded || !GA_ID) return; gaLoaded = true;
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
  }
  function track(name, params) { if (gaLoaded) window.gtag('event', name, params || {}); }
  window.araTrack = track;

  var banner = document.getElementById('cookie');
  function setConsent(v) { store(CONSENT_KEY, v); if (banner) banner.classList.remove('show'); if (v === 'si') loadGA(); }
  var c = store(CONSENT_KEY);
  if (c === 'si') loadGA(); else if (c !== 'no' && banner) banner.classList.add('show');
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-consent]');
    if (t) { e.preventDefault(); setConsent(t.getAttribute('data-consent')); }
    var o = e.target.closest('[data-open-cookie]');
    if (o && banner) { e.preventDefault(); banner.classList.add('show'); }
  });

  /* Eventi di conversione: telefono, email, prenotazione, referti, PDF, mappa */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a) return;
    var h = a.getAttribute('href') || '';
    var where = a.getAttribute('data-pos') || '';
    if (h.indexOf('tel:') === 0) track('click_telefono', { posizione: where });
    else if (h.indexOf('mailto:') === 0) track('click_email', { posizione: where });
    else if (h.indexOf('incifra.it/booking') > -1) track('click_prenotazione', { posizione: where });
    else if (h.indexOf('infomedica.it') > -1) track('click_referti', { posizione: where });
    else if (/\.pdf($|\?)/i.test(h)) track('download_pdf', { file: h });
    else if (h.indexOf('google.com/maps') > -1) track('click_indicazioni', { posizione: where });
  });

  /* ---------- Menu mobile ---------- */
  var nav = document.getElementById('nav');
  var toggles = document.querySelectorAll('[data-menu]');
  toggles.forEach(function (b) {
    b.addEventListener('click', function () {
      var open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      document.querySelector('.menu-toggle').setAttribute('aria-expanded', open);
    });
  });
  document.querySelectorAll('.nav button.dd').forEach(function (b) {
    b.addEventListener('click', function () {
      var li = b.parentElement; var o = !li.classList.contains('open');
      document.querySelectorAll('.nav li.open').forEach(function (x) { if (x !== li) x.classList.remove('open'); });
      li.classList.toggle('open', o); b.setAttribute('aria-expanded', o);
    });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav) { nav.classList.remove('open'); document.body.classList.remove('menu-open'); } });

  /* ---------- Aperto / chiuso ora ---------- */
  var badge = document.querySelectorAll('[data-open-status]');
  if (badge.length) {
    var now = new Date(), d = now.getDay(), m = now.getHours() * 60 + now.getMinutes(), open = false;
    var dec = now.getMonth() === 11 && now.getDate() >= 24;
    if (!dec) {
      if (d >= 1 && d <= 5) open = (m >= 450 && m < 840) || (m >= 930 && m < 1110);
      else if (d === 6) open = m >= 450 && m < 780;
    }
    badge.forEach(function (b) { b.textContent = open ? 'Aperto ora' : 'Chiuso ora'; b.classList.toggle('on', open); });
  }

  /* ---------- Avviso chiusura 24–31 dicembre ---------- */
  var lb = document.getElementById('lightbox-overlay');
  if (lb) {
    var n = new Date();
    if (n.getMonth() === 11 && n.getDate() >= 24) {
      setTimeout(function () { lb.classList.add('show'); }, 1000);
      var bar = document.getElementById('notice-bar'); if (bar) bar.hidden = false;
    }
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.id === 'lightbox-close') lb.classList.remove('show'); });
  }

  /* ---------- Ricerca esami ---------- */
  var q = document.getElementById('exam-search');
  if (q) {
    var items = Array.prototype.slice.call(document.querySelectorAll('.exam-list li'));
    var letters = document.querySelectorAll('.exam-letter');
    var count = document.getElementById('exam-count');
    var norm = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' '); };
    items.forEach(function (li) { li._t = norm(li.textContent + ' ' + (li.getAttribute('data-k') || '')); });
    var timer;
    q.addEventListener('input', function () {
      var v = norm(q.value).trim(), shown = 0;
      items.forEach(function (li) { var ok = !v || v.split(' ').every(function (w) { return li._t.indexOf(w) > -1; }); li.hidden = !ok; if (ok) shown++; });
      document.querySelectorAll('.exam-group').forEach(function (g) { g.hidden = !g.querySelector('li:not([hidden])'); });
      if (count) count.textContent = v ? shown + ' esami trovati' : items.length + ' esami in elenco';
      clearTimeout(timer); timer = setTimeout(function () { if (v.length > 2) track('ricerca_esame', { termine: v }); }, 1200);
    });
    var params = new URLSearchParams(location.search); if (params.get('q')) { q.value = params.get('q'); q.dispatchEvent(new Event('input')); }
  }

  /* ---------- Mappa Google caricata solo su richiesta (privacy) ---------- */
  document.querySelectorAll('[data-map]').forEach(function (b) {
    b.addEventListener('click', function () {
      var box = b.closest('.map-box');
      var f = document.createElement('iframe');
      f.src = b.getAttribute('data-map'); f.loading = 'lazy'; f.title = 'Mappa Centro Diagnostico Ara Iani'; f.referrerPolicy = 'no-referrer-when-downgrade';
      box.innerHTML = ''; box.appendChild(f);
    });
  });

  /* ---------- Esito modulo (?inviato=1 / ?errore=1) ---------- */
  var fr = document.getElementById('form-result');
  if (fr) {
    var p = new URLSearchParams(location.search);
    if (p.get('inviato')) { fr.innerHTML = '<div class="alert ok">Grazie! Il messaggio è stato inviato. Ti risponderemo al più presto.</div>'; track('invio_modulo', { tipo: fr.getAttribute('data-tipo') }); }
    if (p.get('errore')) fr.innerHTML = '<div class="alert err">Non è stato possibile inviare il messaggio. Controlla i campi obbligatori oppure chiamaci allo 0825 871039.</div>';
  }
  var ts = document.querySelectorAll('input[name="ts"]'); ts.forEach(function (i) { i.value = Math.floor(Date.now() / 1000); });

  /* Anno nel footer */
  var y = document.getElementById('anno'); if (y) y.textContent = new Date().getFullYear();
})();
