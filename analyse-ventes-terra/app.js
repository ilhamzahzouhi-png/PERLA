'use strict';
/* ==========================================================================
   Analyse des ventes digitales — Terra Collection / Perla Group
   Données : data.js (const TERRA_DATA = { detail:[...], allsales:[...] })
   ========================================================================== */

const DETAIL = TERRA_DATA.detail;      // 22 dossiers digitaux (détaillés)
const ALL = TERRA_DATA.allsales;       // 60 ventes toutes origines

/* ---------- Helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
const esc = s => (s == null ? '' : String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));

// "DD/MM/YYYY" or "DD/MM/YYYY HH:MM" -> Date | null
function parseDate(s) {
  if (!s) return null;
  const m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return new Date(+m[3], +m[2] - 1, +m[1]);
}
function dOnly(s) { return s ? String(s).slice(0, 10) : null; }
const fmtPct = (n, d = 0) => (n * 100).toFixed(d).replace('.', ',') + ' %';
const fmtNum = (n, d = 0) => (n == null || isNaN(n)) ? '—' : Number(n).toFixed(d).replace('.', ',');

function isDigital(r) { return ['META', 'SITE TC', 'SITE PI'].includes(r.source); }
function isCRC(r) { return r.crc && r.crc.startsWith('CRC'); }
function statutClass(s) {
  const t = (s || '').toUpperCase();
  if (t.includes('ANNUL')) return 'st-annulee';
  if (t === 'ACTIVE') return 'st-active';
  return 'st-cours';
}
function statutLabel(s) {
  const t = (s || '').toUpperCase();
  if (t.includes('ANNUL')) return 'Annulée';
  if (t === 'ACTIVE') return 'Active';
  return 'En cours';
}

/* ---------- Tabs ---------- */
$$('#tabs .tab').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('#tabs .tab').forEach(b => b.classList.remove('active'));
    $$('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    $('#view-' + btn.dataset.tab).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
$('#printBtn').addEventListener('click', () => window.print());

/* ==========================================================================
   1. OVERVIEW
   ========================================================================== */
function renderOverview() {
  const total = ALL.length;
  const digital = DETAIL.length;
  const partDigital = digital / total;
  const delais = DETAIL.map(r => r.delai_visite_vente).filter(v => typeof v === 'number');
  const delaiMoy = delais.reduce((a, b) => a + b, 0) / delais.length;

  $('#overview-lead').innerHTML =
    `Sur les <b>${total}</b> dossiers de vente enregistrés pour Terra Collection, <b>${digital}</b> proviennent d'une campagne digitale, soit <b>${fmtPct(partDigital, 1)}</b> du total.`;

  const kpis = [
    { val: total, lbl: 'Ventes totales (toutes origines)', sub: 'Référence portefeuille' },
    { val: digital, lbl: 'Ventes issues du digital', sub: 'META · SITE TC · SITE PI', accent: true },
    { val: fmtPct(partDigital, 1), lbl: 'Part du digital', sub: 'dans l\'ensemble des ventes' },
    { val: fmtNum(delaiMoy, 0) + ' j', lbl: 'Délai moyen visite → vente', sub: 'sur les dossiers digitaux' },
  ];
  $('#kpiGrid').innerHTML = kpis.map(k =>
    `<div class="kpi${k.accent ? ' accent' : ''}"><div class="val">${k.val}</div><div class="lbl">${k.lbl}</div><div class="sub">${k.sub}</div></div>`
  ).join('');

  // Source donut
  const bySource = countBy(DETAIL, r => r.source);
  const srcColors = { 'META': 'var(--perla)', 'SITE TC': 'var(--blue-gray-2)', 'SITE PI': 'var(--blue-gray-3)' };
  const order = ['META', 'SITE TC', 'SITE PI'];
  let acc = 0; const segs = [];
  order.forEach(s => {
    const n = bySource[s] || 0; const frac = n / digital;
    segs.push(`${srcColors[s]} ${(acc * 100).toFixed(2)}% ${((acc + frac) * 100).toFixed(2)}%`);
    acc += frac;
  });
  $('#sourceDonut').style.background = `conic-gradient(${segs.join(',')})`;
  $('#sourceLegend').innerHTML = order.map(s =>
    `<div class="li"><span class="sw" style="background:${srcColors[s]}"></span>
     <span><b>${s}</b> · ${bySource[s] || 0} ventes <small>(${fmtPct((bySource[s] || 0) / digital, 0)})</small></span></div>`
  ).join('');

  // Statut bars
  const byStatut = countBy(DETAIL, r => statutLabel(r.statut));
  barChart('#statutBars', ['En cours', 'Active', 'Annulée'].filter(k => byStatut[k]).map(k => ({
    label: k, value: byStatut[k], cls: k === 'Annulée' ? 'soft' : (k === 'Active' ? 'alt' : '')
  })), digital);

  // Agent bars
  const byAgent = countBy(DETAIL, r => r.agent);
  const agents = Object.entries(byAgent).sort((a, b) => b[1] - a[1]);
  barChart('#agentBars', agents.map(([a, n]) => ({ label: a, value: n })), agents[0][1]);

  // Délai by source
  const delaiBySource = order.map(s => {
    const rows = DETAIL.filter(r => r.source === s && typeof r.delai_visite_vente === 'number');
    const avg = rows.length ? rows.reduce((a, r) => a + r.delai_visite_vente, 0) / rows.length : 0;
    return { label: s, value: Math.round(avg), suffix: ' j' };
  });
  barChart('#delaiBars', delaiBySource, Math.max(...delaiBySource.map(d => d.value)));

  $('#overview-note').textContent =
    `META génère ${bySource['META']} des ${digital} ventes digitales (${fmtPct((bySource['META'] || 0) / digital, 0)}), très largement devant les sites web du projet. Le délai de conversion varie fortement selon la source et le profil du prospect — d'où l'intérêt de la lecture dossier par dossier.`;
}

function countBy(arr, fn) {
  const o = {};
  arr.forEach(x => { const k = fn(x); if (k == null) return; o[k] = (o[k] || 0) + 1; });
  return o;
}
function barChart(sel, items, max) {
  const m = max || Math.max(...items.map(i => i.value), 1);
  $(sel).innerHTML = items.map(i => {
    const w = Math.max((i.value / m) * 100, 2);
    return `<div class="bar-row"><div class="bl" title="${esc(i.label)}">${esc(i.label)}</div>
      <div class="bar-track"><div class="bar-fill ${i.cls || ''}" style="width:${w}%"></div></div>
      <div class="bar-val">${i.value}${i.suffix || ''}</div></div>`;
  }).join('');
}

/* ==========================================================================
   2. JOURNEYS (prospect par prospect)
   ========================================================================== */
function fillSelect(sel, values, current) {
  const s = $(sel);
  values.forEach(v => { const o = el('option'); o.value = v; o.textContent = v; s.appendChild(o); });
}
function initJourneyFilters() {
  fillSelect('#jSource', ['META', 'SITE TC', 'SITE PI']);
  const crc = $('#jCrc');
  [['CRC', 'CRC (pris en charge)'], ['DIRECT', 'Contact direct']].forEach(([v, l]) => {
    const o = el('option'); o.value = v; o.textContent = l; crc.appendChild(o);
  });
  fillSelect('#jStatut', ['En cours', 'Active', 'Annulée']);
  fillSelect('#jAgent', Array.from(new Set(DETAIL.map(r => r.agent))).sort());
  ['#jSearch', '#jSource', '#jCrc', '#jStatut', '#jAgent'].forEach(s =>
    $(s).addEventListener('input', renderJourneys));
}
function renderJourneys() {
  const q = $('#jSearch').value.trim().toLowerCase();
  const fSrc = $('#jSource').value, fCrc = $('#jCrc').value, fSt = $('#jStatut').value, fAg = $('#jAgent').value;

  let rows = DETAIL.filter(r => {
    if (q && !((r.nom + ' ' + (r.prenom || '')).toLowerCase().includes(q))) return false;
    if (fSrc && r.source !== fSrc) return false;
    if (fCrc === 'CRC' && !isCRC(r)) return false;
    if (fCrc === 'DIRECT' && isCRC(r)) return false;
    if (fSt && statutLabel(r.statut) !== fSt) return false;
    if (fAg && r.agent !== fAg) return false;
    return true;
  });
  // sort by sale date
  rows.sort((a, b) => (parseDate(a.date_vente) || 0) - (parseDate(b.date_vente) || 0));

  $('#jCount').textContent = `${rows.length} dossier${rows.length > 1 ? 's' : ''} affiché${rows.length > 1 ? 's' : ''}`;
  const list = $('#journeyList');
  list.innerHTML = '';
  if (!rows.length) { list.innerHTML = '<div class="card">Aucun dossier ne correspond à ces filtres.</div>'; return; }
  rows.forEach(r => list.appendChild(journeyCard(r)));
}
function journeyCard(r) {
  const card = el('div', 'jcard');
  card.dataset.id = r.id;
  const stc = statutClass(r.statut);
  const crcBadge = isCRC(r)
    ? '<span class="badge crc">CRC — pris en charge</span>'
    : '<span class="badge direct">Contact direct</span>';

  const head = el('div', 'jhead');
  head.innerHTML = `
    <div>
      <div class="jname">${esc(r.nom)} <span class="prenom">${esc(r.prenom || '')}</span></div>
      <div class="jmeta">
        <span class="badge src">${esc(r.source)}</span>
        <span class="badge canal">${esc(r.canal)}</span>
        ${crcBadge}
        <span class="badge ${stc}">${statutLabel(r.statut)}</span>
      </div>
    </div>
    <div class="jhead-right">
      <div class="villa">${esc(r.bien || '')}</div>
      <div class="toggle">Voir le parcours détaillé ▾</div>
    </div>`;

  const body = el('div', 'jbody');
  body.innerHTML = datesStrip(r) + vrBlock(r) + resumeBlock(r) + timelineBlock(r) + extraBlock(r);

  head.addEventListener('click', () => {
    card.classList.toggle('open');
    head.querySelector('.toggle').textContent = card.classList.contains('open')
      ? 'Masquer le parcours ▴' : 'Voir le parcours détaillé ▾';
  });

  card.appendChild(head);
  card.appendChild(body);
  return card;
}
function dcell(label, val, muted) {
  return `<div class="dcell"><div class="dl">${label}</div><div class="dv ${muted ? 'muted' : ''}">${val || '—'}</div></div>`;
}
function datesStrip(r) {
  const delai = (typeof r.delai_visite_vente === 'number') ? r.delai_visite_vente + ' j' : '—';
  return `<div class="dates-strip">
    ${dcell('Création fiche', dOnly(r.date_crm), !r.date_crm)}
    ${dcell('Appel / email', r.date_appel, !r.date_appel)}
    ${dcell('Visite (fiche)', r.date_visite, !r.date_visite)}
    ${dcell('Vente', r.date_vente, !r.date_vente)}
    ${dcell('Délai visite→vente', delai, delai === '—')}
  </div>`;
}
function resumeBlock(r) {
  if (!r.resume) return '';
  return `<div class="resume"><b>Résumé.</b> ${esc(r.resume)}</div>`;
}
function timelineBlock(r) {
  let steps = r.journey || [];
  const saleD = parseDate(r.date_vente);
  let html = '<div class="tl-title">Parcours chronologique (dates une à une)</div>';
  if (!steps.length) {
    html += '<div class="tl-empty">Aucune note chronologique enregistrée dans le CRM pour ce dossier.</div>';
  } else {
    html += '<div class="timeline">';
    steps.forEach(s => {
      const tag = detectTag(s.text);
      html += `<div class="tl-step">
        <div class="tl-date">${s.date ? esc(s.date) : '(date non précisée)'}</div>
        <div class="tl-text">${tag}${esc(s.text)}</div></div>`;
    });
    // final sale step
    if (saleD) {
      html += `<div class="tl-step sale">
        <div class="tl-date">${esc(r.date_vente)}</div>
        <div class="tl-text"><span class="tl-tag v" style="background:#E4EFEA;color:var(--ok)">VENTE</span>Vente enregistrée — ${esc(r.bien || '')}</div></div>`;
    }
    html += '</div>';
  }
  return html;
}
function classifyStep(text) {
  const t = (text || '').toLowerCase();
  if (/^v\d|visite|est pass|est repass|repasse|est venu/.test(t)) return 'visite';
  if (/^r\d|relance|ne r[ée]p|injoignable|nrp|rappel|à relancer|a\.r/.test(t)) return 'relance';
  return null;
}
function detectTag(text) {
  const c = classifyStep(text);
  if (c === 'visite') return '<span class="tl-tag v">Visite</span>';
  if (c === 'relance') return '<span class="tl-tag r">Relance</span>';
  return '';
}
function extraBlock(r) {
  return `<div class="jextra">
    <span>Agent : <b>${esc(r.agent || '—')}</b></span>
    <span>Paiement : <b>${esc(r.paiement || 'Non défini')}</b></span>
    <span>Points de contact : <b>${r.nb_contacts ?? '—'}</b></span>
    <span>Téléphone : <b>${esc(r.tel || '—')}</b></span>
  </div>`;
}

/* ---------- Dates de visite & de relance (auto + saisie manuelle) ---------- */
const VR_KEY = 'terra_vr_overrides';
function loadOverrides() { try { return JSON.parse(localStorage.getItem(VR_KEY) || '{}'); } catch (e) { return {}; } }
function saveOverrides(o) { try { localStorage.setItem(VR_KEY, JSON.stringify(o)); } catch (e) {} }
let VR_OVERRIDES = loadOverrides();

function uniqSortDates(arr) {
  const seen = new Set(), out = [];
  (arr || []).forEach(d => { if (d && !seen.has(d)) { seen.add(d); out.push(d); } });
  out.sort((a, b) => (parseDate(a) || 0) - (parseDate(b) || 0));
  return out;
}
function autoDates(r) {
  const v = [], rl = [];
  (r.journey || []).forEach(s => {
    if (!s.date) return;
    const c = classifyStep(s.text);
    if (c === 'visite') v.push(s.date);
    else if (c === 'relance') rl.push(s.date);
  });
  return { visites: uniqSortDates(v), relances: uniqSortDates(rl) };
}
function effectiveDates(r) {
  const o = VR_OVERRIDES[r.id];
  if (o) return { visites: uniqSortDates(o.visites), relances: uniqSortDates(o.relances) };
  return autoDates(r);
}
function normalizeDate(val) {
  const m = String(val || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dd = +m[1], mm = +m[2];
  if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return null;
  return String(dd).padStart(2, '0') + '/' + String(mm).padStart(2, '0') + '/' + m[3];
}
function ensureOverride(id) {
  if (!VR_OVERRIDES[id]) {
    const a = autoDates(DETAIL.find(x => x.id === id));
    VR_OVERRIDES[id] = { visites: [...a.visites], relances: [...a.relances] };
  }
}
function addDate(id, cat, val) {
  const d = normalizeDate(val);
  if (!d) { alert('Date invalide. Format attendu : JJ/MM/AAAA (ex. 09/07/2025).'); return; }
  ensureOverride(id);
  VR_OVERRIDES[id][cat] = uniqSortDates([...VR_OVERRIDES[id][cat], d]);
  saveOverrides(VR_OVERRIDES);
  rerenderVR(id);
}
function removeDate(id, cat, date) {
  ensureOverride(id);
  VR_OVERRIDES[id][cat] = VR_OVERRIDES[id][cat].filter(d => d !== date);
  saveOverrides(VR_OVERRIDES);
  rerenderVR(id);
}
function resetDates(id) {
  delete VR_OVERRIDES[id];
  saveOverrides(VR_OVERRIDES);
  rerenderVR(id);
}
function vrCategory(r, key, label) {
  const eff = effectiveDates(r);
  const dates = eff[key];
  const crm = key === 'visites' ? r.nb_visites : r.nb_relances;
  const chips = dates.length
    ? dates.map(d => `<span class="chip">${esc(d)}<button class="x" data-act="del" data-id="${r.id}" data-cat="${key}" data-date="${esc(d)}" title="Supprimer cette date">×</button></span>`).join('')
    : '<span class="vr-empty">Aucune date enregistrée</span>';
  const hint = (typeof crm === 'number' && crm !== dates.length)
    ? `<small class="vr-hint" title="Nombre indiqué dans le CRM">CRM : ${crm}</small>` : '';
  return `<div class="vr-row">
    <div class="vr-head"><span class="vr-lbl vr-${key}">${label}</span><span class="vr-count">${dates.length}</span>${hint}</div>
    <div class="vr-chips">${chips}
      <span class="vr-add">
        <input type="text" placeholder="JJ/MM/AAAA" maxlength="10" data-id="${r.id}" data-cat="${key}" aria-label="Ajouter une date de ${label.toLowerCase()}">
        <button class="vr-addbtn" data-act="add" data-id="${r.id}" data-cat="${key}">+ Ajouter</button>
      </span>
    </div></div>`;
}
function vrBlock(r) {
  const overridden = !!VR_OVERRIDES[r.id];
  return `<div class="vr-block${overridden ? ' edited' : ''}">
    <div class="vr-title">Dates de visite &amp; de relance
      ${overridden ? `<button class="vr-reset" data-act="reset" data-id="${r.id}" title="Effacer vos modifications et revenir aux dates détectées automatiquement">↺ Dates détectées</button>` : ''}
    </div>
    ${vrCategory(r, 'visites', 'Visites')}
    ${vrCategory(r, 'relances', 'Relances')}
  </div>`;
}
function rerenderVR(id) {
  const card = $$('#journeyList .jcard').find(c => c.dataset.id === id);
  if (!card) return;
  const old = card.querySelector('.vr-block');
  if (!old) return;
  const tmp = el('div'); tmp.innerHTML = vrBlock(DETAIL.find(x => x.id === id));
  old.replaceWith(tmp.firstElementChild);
}
function initVREditing() {
  const list = $('#journeyList');
  list.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    e.stopPropagation();
    const { act, id, cat } = btn.dataset;
    if (act === 'del') removeDate(id, cat, btn.dataset.date);
    else if (act === 'add') { const inp = btn.parentElement.querySelector('input'); addDate(id, cat, inp.value); }
    else if (act === 'reset') resetDates(id);
  });
  list.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const inp = e.target.closest('.vr-add input');
    if (!inp) return;
    e.preventDefault();
    addDate(inp.dataset.id, inp.dataset.cat, inp.value);
  });
}

/* ==========================================================================
   3. GLOBAL JOURNEY
   ========================================================================== */
function renderGlobal() {
  const n = DETAIL.length;
  const withAppel = DETAIL.filter(r => r.date_appel).length;
  const withVisite = DETAIL.filter(r => r.date_visite).length;
  const withRelance = DETAIL.filter(r => (r.nb_relances || 0) > 0).length;
  const multiVisite = DETAIL.filter(r => (r.nb_visites || 0) >= 2).length;
  const vendus = DETAIL.filter(r => !statutLabel(r.statut).includes('Annul')).length;

  const steps = [
    { l: 'Contact digital', s: 'Lead / message / visite issu d\'une campagne', v: n },
    { l: 'Qualification (appel/email)', s: 'échange avant ou autour de la visite', v: withAppel },
    { l: 'Visite du projet', s: 'au moins une visite enregistrée', v: withVisite },
    { l: 'Plusieurs visites', s: '2 visites ou plus', v: multiVisite },
    { l: 'Relance commerciale', s: 'au moins une relance', v: withRelance },
    { l: 'Vente (non annulée)', s: 'dossier abouti ou en cours', v: vendus },
  ];
  const max = n;
  $('#funnel').innerHTML = steps.map(st => {
    const w = Math.max((st.v / max) * 100, 8);
    return `<div class="fstep">
      <div class="fl"><b>${st.l}</b><small>${st.s}</small></div>
      <div class="fbar" style="width:${w}%">${st.v} <span style="opacity:.75;font-weight:500;margin-left:6px">/ ${n}</span></div>
    </div>`;
  }).join('');
  $('#funnelNote').textContent =
    'Lecture : chaque étape indique combien des 22 dossiers digitaux présentent cette caractéristique dans le CRM. Les étapes ne sont pas strictement séquentielles (certains prospects arrivent déjà mûrs, d\'autres nécessitent plusieurs visites et relances).';

  // effort stats
  const avg = (fn) => { const a = DETAIL.map(fn).filter(v => typeof v === 'number'); return a.reduce((x, y) => x + y, 0) / a.length; };
  const stats = [
    { l: 'Visites par dossier', v: fmtNum(avg(r => r.nb_visites), 1) },
    { l: 'Relances par dossier', v: fmtNum(avg(r => r.nb_relances), 1) },
    { l: 'Points de contact par dossier', v: fmtNum(avg(r => r.nb_contacts), 1) },
    { l: 'Délai moyen visite → vente', v: fmtNum(avg(r => r.delai_visite_vente), 0), u: ' jours' },
  ];
  $('#effortStats').innerHTML = stats.map(s =>
    `<div class="srow"><span class="sl">${s.l}</span><span class="sv">${s.v}${s.u ? '<small>' + s.u + '</small>' : ''}</span></div>`
  ).join('');

  // délai histogram
  const buckets = [
    { l: '0–7 j (immédiat)', min: 0, max: 7 },
    { l: '8–30 j', min: 8, max: 30 },
    { l: '31–90 j', min: 31, max: 90 },
    { l: '91–180 j', min: 91, max: 180 },
    { l: '+180 j (très long)', min: 181, max: 1e9 },
  ];
  const delais = DETAIL.map(r => r.delai_visite_vente).filter(v => typeof v === 'number');
  const hist = buckets.map(b => ({ label: b.l, value: delais.filter(d => d >= b.min && d <= b.max).length }));
  barChart('#delaiHisto', hist, Math.max(...hist.map(h => h.value)));

  renderTimeline();
}
function renderTimeline() {
  // rows with both first-visit and sale date
  const rows = DETAIL.map(r => {
    const v = parseDate(r.date_visite), s = parseDate(r.date_vente);
    return { r, v, s };
  }).filter(x => x.v && x.s);
  const allDates = [];
  rows.forEach(x => { allDates.push(x.v, x.s); });
  const min = new Date(Math.min(...allDates)), max = new Date(Math.max(...allDates));
  const span = (max - min) || 1;
  const pos = d => ((d - min) / span) * 100;

  rows.sort((a, b) => a.v - b.v);
  const cont = $('#timeline');
  cont.innerHTML = rows.map(x => {
    const p1 = pos(x.v), p2 = pos(x.s);
    const left = Math.min(p1, p2), width = Math.max(Math.abs(p2 - p1), 0.5);
    const nm = esc(x.r.nom);
    const tip = `${x.r.nom} — visite ${x.r.date_visite} → vente ${x.r.date_vente} (${x.r.delai_visite_vente} j)`;
    return `<div class="tg-row" title="${esc(tip)}">
      <div class="tg-name">${nm}</div>
      <div class="tg-track">
        <div class="tg-span" style="left:${left}%;width:${width}%"></div>
        <div class="tg-dot" style="left:${p1}%"></div>
        <div class="tg-sale" style="left:${p2}%"></div>
      </div></div>`;
  }).join('') +
    `<div class="tg-axis"><div></div><div class="ax"><span>${min.toLocaleDateString('fr-FR')}</span><span>${max.toLocaleDateString('fr-FR')}</span></div></div>`;
}

/* ==========================================================================
   4. COMPARE CRC vs DIRECT
   ========================================================================== */
function renderCompare() {
  const crc = DETAIL.filter(isCRC), dir = DETAIL.filter(r => !isCRC(r));
  const stat = (arr, st) => arr.filter(r => statutLabel(r.statut) === st).length;
  const avg = (arr, fn) => { const a = arr.map(fn).filter(v => typeof v === 'number'); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; };

  const rows = [
    ['Nombre de ventes', crc.length, dir.length],
    ['Statut : Active', stat(crc, 'Active'), stat(dir, 'Active')],
    ['Statut : En cours', stat(crc, 'En cours'), stat(dir, 'En cours')],
    ['Statut : Annulée', stat(crc, 'Annulée'), stat(dir, 'Annulée')],
    ['Délai moyen visite → vente (j)', fmtNum(avg(crc, r => r.delai_visite_vente), 1), fmtNum(avg(dir, r => r.delai_visite_vente), 1)],
    ['Visites moyennes / dossier', fmtNum(avg(crc, r => r.nb_visites), 1), fmtNum(avg(dir, r => r.nb_visites), 1)],
    ['Relances moyennes / dossier', fmtNum(avg(crc, r => r.nb_relances), 1), fmtNum(avg(dir, r => r.nb_relances), 1)],
    ['Points de contact moyens / dossier', fmtNum(avg(crc, r => r.nb_contacts), 1), fmtNum(avg(dir, r => r.nb_contacts), 1)],
  ];
  $('#compareTable').innerHTML = `<table class="cmp-table">
    <thead><tr><th>Indicateur</th><th>CRC — pris en charge</th><th>Contact direct</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td></tr>`).join('')}</tbody>
  </table>`;
}

/* ==========================================================================
   5. ALL SALES TABLE
   ========================================================================== */
let allSort = { key: 'date_vente', dir: -1 };
function initAllTable() {
  fillSelect('#aStatut', ['Active', 'En cours', 'Annulée']);
  ['#aSearch', '#aDigital', '#aStatut'].forEach(s => $(s).addEventListener('input', renderAllTable));
  $$('#allTable th').forEach(th => th.addEventListener('click', () => {
    const k = th.dataset.sort;
    allSort.dir = (allSort.key === k) ? -allSort.dir : 1;
    allSort.key = k;
    renderAllTable();
  }));
}
function renderAllTable() {
  const q = $('#aSearch').value.trim().toLowerCase();
  const fD = $('#aDigital').value, fS = $('#aStatut').value;
  let rows = ALL.filter(r => {
    if (q && !((r.nom + ' ' + (r.prenom || '') + ' ' + (r.bien || '')).toLowerCase().includes(q))) return false;
    if (fD && r.digitale !== fD) return false;
    if (fS && statutLabel(r.statut) !== fS) return false;
    return true;
  });
  const k = allSort.key;
  rows.sort((a, b) => {
    let va = a[k], vb = b[k];
    if (k.startsWith('date_')) { va = parseDate(va) || 0; vb = parseDate(vb) || 0; }
    else if (k === 'delai_visite_vente') { va = va ?? -1; vb = vb ?? -1; }
    else { va = (va || '').toString().toLowerCase(); vb = (vb || '').toString().toLowerCase(); }
    return (va < vb ? -1 : va > vb ? 1 : 0) * allSort.dir;
  });
  $('#aCount').textContent = `${rows.length} / ${ALL.length} ventes`;
  $('#allTable tbody').innerHTML = rows.map(r => `<tr>
    <td class="name">${esc(r.nom)} <span style="font-weight:400;color:var(--blue-gray-2)">${esc(r.prenom || '')}</span></td>
    <td><span class="pill ${r.digitale === 'Oui' ? 'yes' : 'no'}">${r.digitale}</span></td>
    <td>${esc(r.source || '—')}</td>
    <td>${isCRC(r) ? 'CRC' : 'Direct'}</td>
    <td>${esc(r.date_visite || '—')}</td>
    <td>${esc(r.date_vente || '—')}</td>
    <td>${r.delai_visite_vente ?? '—'}</td>
    <td><span class="badge ${statutClass(r.statut)}">${statutLabel(r.statut)}</span></td>
    <td class="villa-cell" title="${esc(r.bien || '')}">${esc(r.bien || '—')}</td>
    <td>${esc(r.agent || '—')}</td>
  </tr>`).join('');
}

/* ==========================================================================
   6. DATA QUALITY
   ========================================================================== */
function renderQuality() {
  const anomalies = [];
  DETAIL.forEach(r => {
    const crm = parseDate(r.date_crm), vis = parseDate(r.date_visite), sale = parseDate(r.date_vente);
    const found = [];
    if (crm && vis && crm > vis) found.push({ t: 'Fiche créée après la visite', d: `Fiche CRM le ${dOnly(r.date_crm)}, visite renseignée le ${r.date_visite} → saisie a posteriori.` });
    if (!r.date_visite) found.push({ t: 'Date de visite manquante', d: 'Aucune date de visite renseignée dans la fiche.' });
    if (!r.date_appel && isCRC(r)) found.push({ t: 'Date d\'appel/email manquante', d: 'Dossier CRC sans date de qualification enregistrée.' });
    // visite field mismatch vs first journey date
    if (r.journey && r.journey.length) {
      const firstJ = r.journey.map(s => parseDate(s.date)).filter(Boolean).sort((a, b) => a - b)[0];
      if (firstJ && vis) {
        const diff = Math.abs((firstJ - vis) / 86400000);
        if (diff > 20) found.push({ t: 'Date de visite incohérente', d: `Champ « Date de visite » = ${r.date_visite}, mais 1ère note datée du ${r.journey.find(s => parseDate(s.date))?.date} (écart ~${Math.round(diff)} j).` });
      }
    }
    if (!r.journey || !r.journey.length) found.push({ t: 'Aucune note de suivi', d: 'Traçabilité chronologique absente — parcours non analysable finement.' });
    found.forEach(f => anomalies.push({ r, ...f }));
  });

  const nDossiers = new Set(anomalies.map(a => a.r.id)).size;
  const kpis = [
    { val: DETAIL.length, lbl: 'Dossiers digitaux analysés' },
    { val: nDossiers, lbl: 'Dossiers avec ≥ 1 anomalie', accent: true },
    { val: anomalies.length, lbl: 'Anomalies détectées au total' },
    { val: fmtPct(nDossiers / DETAIL.length, 0), lbl: 'Taux de dossiers concernés' },
  ];
  $('#qualityKpi').innerHTML = kpis.map(k =>
    `<div class="kpi${k.accent ? ' accent' : ''}"><div class="val">${k.val}</div><div class="lbl">${k.lbl}</div></div>`
  ).join('');

  $('#qualityTable tbody').innerHTML = anomalies.map(a => `<tr>
    <td class="name" style="white-space:normal">${esc(a.r.nom)} ${esc(a.r.prenom || '')}</td>
    <td style="white-space:normal"><b style="color:var(--perla)">${esc(a.t)}</b></td>
    <td style="white-space:normal;color:var(--ink-soft)">${esc(a.d)}</td>
  </tr>`).join('');
}

/* ==========================================================================
   INIT
   ========================================================================== */
renderOverview();
initJourneyFilters();
initVREditing();
renderJourneys();
renderGlobal();
renderCompare();
initAllTable();
renderAllTable();
renderQuality();
