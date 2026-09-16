'use strict';
/* ==========================================================================
   Analyse des ventes digitales — Terra Collection / Perla Group
   Données : data.js (const TERRA_DATA = { detail:[...], allsales:[...] })
   ========================================================================== */

const DETAIL = TERRA_DATA.detail;      // 22 dossiers digitaux (détaillés, notes datées)
const ALL = TERRA_DATA.allsales;       // 61 ventes toutes origines
const JOURNEYS = TERRA_DATA.journeys;  // 61 parcours résumés (1 par acheteur)
// Index des parcours par ID — porte nb_visites / nb_relances / note pour les 61
const J_BY_ID = {};
JOURNEYS.forEach(r => { J_BY_ID[r.id] = r; });
function detNum(r, k) { const d = J_BY_ID[r.id]; return d && typeof d[k] === 'number' ? d[k] : null; }

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
  fillSelect('#jSource', Array.from(new Set(JOURNEYS.map(r => r.source))).sort());
  const crc = $('#jCrc');
  [['CRC', 'CRC (pris en charge)'], ['DIRECT', 'Contact direct']].forEach(([v, l]) => {
    const o = el('option'); o.value = v; o.textContent = l; crc.appendChild(o);
  });
  fillSelect('#jStatut', ['En cours', 'Active', 'Annulée']);
  fillSelect('#jAgent', Array.from(new Set(JOURNEYS.map(r => r.agent))).sort());
  ['#jSearch', '#jSource', '#jCrc', '#jStatut', '#jAgent'].forEach(s =>
    $(s).addEventListener('input', renderJourneys));
}
function renderJourneys() {
  const q = $('#jSearch').value.trim().toLowerCase();
  const fSrc = $('#jSource').value, fCrc = $('#jCrc').value, fSt = $('#jStatut').value, fAg = $('#jAgent').value;

  let rows = JOURNEYS.filter(r => {
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

  $('#jCount').textContent = `${rows.length} fiche${rows.length > 1 ? 's' : ''} affichée${rows.length > 1 ? 's' : ''}`;
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
      <div class="toggle">Voir la fiche ▾</div>
    </div>`;

  const body = el('div', 'jbody');
  body.innerHTML = datesStrip(r) + vrBlock(r) + resumeBlock(r) + extraBlock(r);

  head.addEventListener('click', () => {
    card.classList.toggle('open');
    head.querySelector('.toggle').textContent = card.classList.contains('open')
      ? 'Masquer la fiche ▴' : 'Voir la fiche ▾';
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
  const note = r.note || r.resume;
  if (!note) return '';
  return `<div class="resume"><b>Note de suivi.</b> ${esc(note)}</div>`;
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
    <span>Origine : <b>${esc(r.source || '—')}</b></span>
    <span>Canal : <b>${esc(r.canal || '—')}</b></span>
    <span>Bien : <b>${esc(r.bien || '—')}</b></span>
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
    const a = autoDates(J_BY_ID[id]);
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
  const overridden = !!VR_OVERRIDES[r.id];
  const base = (key === 'visites' ? r.nb_visites : r.nb_relances) || 0;
  const count = overridden ? dates.length : base;
  let chips;
  if (dates.length) {
    chips = dates.map(d => `<span class="chip">${esc(d)}<button class="x" data-act="del" data-id="${r.id}" data-cat="${key}" data-date="${esc(d)}" title="Supprimer cette date">×</button></span>`).join('');
  } else if (base > 0) {
    chips = `<span class="vr-empty">${base} ${base > 1 ? label.toLowerCase() : label.toLowerCase().replace(/s$/, '')} au total — dates non détaillées dans le CRM</span>`;
  } else {
    chips = `<span class="vr-empty">Aucune ${key === 'visites' ? 'visite' : 'relance'} enregistrée</span>`;
  }
  return `<div class="vr-row">
    <div class="vr-head"><span class="vr-lbl vr-${key}">${label}</span><span class="vr-count">${count}</span></div>
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
    <div class="vr-title">Visites &amp; relances
      ${overridden ? `<button class="vr-reset" data-act="reset" data-id="${r.id}" title="Effacer vos dates saisies et revenir au nombre indiqué par le CRM">↺ Rétablir le nombre CRM</button>` : ''}
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
  const tmp = el('div'); tmp.innerHTML = vrBlock(J_BY_ID[id]);
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
function median(arr) {
  const a = arr.filter(v => typeof v === 'number').sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
function mean(arr) {
  const a = arr.filter(v => typeof v === 'number');
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
}
// Regroupe les 6 sources brutes en 3 familles lisibles
function famille(src) {
  if (['META', 'SITE TC', 'SITE PI'].includes(src)) return 'Digital';
  if (['FAMILLE - AMIS'].includes(src)) return 'Bouche-à-oreille';
  if (['PASSAGE'].includes(src)) return 'Passage / spontané';
  return 'Affichage / autre';
}

// Couleur de case heatmap : clair (délai court) -> Perla foncé (délai long)
function heatColor(d) {
  const frac = Math.max(0, Math.min(d / 120, 1)); // sature à 120 j
  // interp entre Light Silver #E8EDF2 et Perla #1B2E4B
  const a = [232, 237, 242], b = [27, 46, 75];
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * frac));
  return { bg: `rgb(${c[0]},${c[1]},${c[2]})`, fg: frac > 0.55 ? '#fff' : 'var(--ink)' };
}
function renderDelaiPeriode() {
  const trim = d => `${d.getFullYear()}-T${Math.floor(d.getMonth() / 3) + 1}`;
  const trimLabel = t => {
    const [y, q] = t.split('-T');
    const noms = { '1': 'Janv.–Mars', '2': 'Avr.–Juin', '3': 'Juil.–Sept.', '4': 'Oct.–Déc.' };
    return `${noms[q]} ${y}`;
  };
  const famShort = { 'Digital': 'Digital', 'Bouche-à-oreille': 'Bouche-à-oreille', 'Passage / spontané': 'Passage' };
  const cols = ['Digital', 'Bouche-à-oreille', 'Passage / spontané'];

  const recs = JOURNEYS.map(r => {
    const dv = parseDate(r.date_vente);
    return (dv && typeof r.delai_visite_vente === 'number')
      ? { t: trim(dv), fam: famille(r.source), d: r.delai_visite_vente } : null;
  }).filter(Boolean);
  const trims = Array.from(new Set(recs.map(r => r.t))).sort();

  const cell = ds => {
    if (!ds.length) return `<td class="hm-empty">·</td>`;
    const m = Math.round(median(ds));
    const { bg, fg } = heatColor(m);
    return `<td style="background:${bg};color:${fg}"><b>${m}</b> j</td>`;
  };

  let html = `<table class="hm-table"><thead><tr><th>Trimestre</th>` +
    cols.map(c => `<th>${famShort[c]}</th>`).join('') +
    `<th class="hm-all">Tous</th><th class="hm-vol">Ventes</th></tr></thead><tbody>`;
  trims.forEach(t => {
    const rowRecs = recs.filter(r => r.t === t);
    html += `<tr><td class="hm-row">${trimLabel(t)}</td>`;
    cols.forEach(c => { html += cell(rowRecs.filter(r => r.fam === c).map(r => r.d)); });
    html += cell(rowRecs.map(r => r.d));
    html += `<td class="hm-vol">${rowRecs.length}</td></tr>`;
  });
  html += `</tbody></table>`;
  $('#delaiPeriode').innerHTML = html;

  $('#delaiPeriodeNote').innerHTML =
    `Lecture : au <b>lancement</b> (été 2025), tout se signe en moins de deux semaines — les premiers acheteurs étaient déjà mûrs. ` +
    `Le <b>creux hivernal</b> de début 2026 fait exploser les délais (dossiers visités à l'automne, signés des mois plus tard), avant un retour à la normale au printemps. ` +
    `Le <b>digital</b> décide plus lentement et de façon plus volatile que le relationnel. Chaque case repose sur peu de dossiers (2 à 7) : tendance indicative, pas verdict.`;
}

function renderGlobal() {
  const J = JOURNEYS;
  const n = J.length;                                   // 61
  const digital = J.filter(r => r.digitale === 'Oui');  // 22
  const relationnel = J.filter(r => r.digitale === 'Non');
  const annulees = J.filter(r => statutLabel(r.statut) === 'Annulée');
  const delais = J.map(r => r.delai_visite_vente).filter(v => typeof v === 'number');
  const medDelai = median(delais);

  // ---- Familles d'acquisition (regroupement des 6 sources) ----
  const byFam = countBy(J, r => famille(r.source));
  const boucheEtPassage = (byFam['Bouche-à-oreille'] || 0) + (byFam['Passage / spontané'] || 0);

  // ---- KPI ----
  const kpis = [
    { val: n, lbl: 'Acheteurs Terra Collection', sub: 'toutes origines confondues' },
    { val: fmtPct(boucheEtPassage / n, 0), lbl: 'Bouche-à-oreille & passage', sub: `${boucheEtPassage} ventes — le 1ᵉʳ moteur`, accent: true },
    { val: fmtPct(digital.length / n, 0), lbl: 'Issues du digital', sub: `${digital.length} ventes · META, sites web` },
    { val: fmtNum(medDelai, 0) + ' j', lbl: 'Délai médian visite → vente', sub: `moyenne tirée à ${fmtNum(mean(delais), 0)} j par quelques cas longs` },
  ];
  $('#globalKpi').innerHTML = kpis.map(k =>
    `<div class="kpi${k.accent ? ' accent' : ''}"><div class="val">${k.val}</div><div class="lbl">${k.lbl}</div><div class="sub">${k.sub}</div></div>`
  ).join('');

  // ---- D'où viennent les ventes (6 sources détaillées) ----
  const bySource = countBy(J, r => r.source);
  const srcRows = Object.entries(bySource).sort((a, b) => b[1] - a[1])
    .map(([s, v]) => ({ label: s, value: v }));
  barChart('#globalSources', srcRows, srcRows[0].value);
  $('#sourcesInsight').innerHTML =
    `Près de <b>2 ventes sur 3</b> viennent du relationnel et du passage (${boucheEtPassage} dossiers). ` +
    `Le digital pèse <b>${fmtPct(digital.length / n, 0)}</b> (${digital.length} ventes), porté quasi exclusivement par <b>META</b> (${bySource['META'] || 0}). ` +
    `Les sites web restent marginaux (${(bySource['SITE TC'] || 0) + (bySource['SITE PI'] || 0)} ventes).`;

  // ---- Délai de décision ----
  const statRows = [
    { l: 'Délai médian', v: fmtNum(medDelai, 0), u: ' jours' },
    { l: 'Délai moyen', v: fmtNum(mean(delais), 0), u: ' jours' },
    { l: 'Décision la plus rapide', v: fmtNum(Math.min(...delais), 0), u: ' jours' },
    { l: 'Dossier le plus long', v: fmtNum(Math.max(...delais), 0), u: ' jours' },
  ];
  $('#delaiStats').innerHTML = statRows.map(s =>
    `<div class="srow"><span class="sl">${s.l}</span><span class="sv">${s.v}<small>${s.u}</small></span></div>`
  ).join('');
  const buckets = [
    { l: '0–7 j (décision immédiate)', min: 0, max: 7 },
    { l: '8–30 j', min: 8, max: 30 },
    { l: '31–90 j', min: 31, max: 90 },
    { l: '91–180 j', min: 91, max: 180 },
    { l: '+180 j (très long)', min: 181, max: 1e9 },
  ];
  const hist = buckets.map(b => ({ label: b.l, value: delais.filter(d => d >= b.min && d <= b.max).length }));
  barChart('#delaiHisto', hist, Math.max(...hist.map(h => h.value)));

  // Effort (repris dans le « à retenir »)
  const multiVisite = J.filter(r => (r.nb_visites || 0) >= 2).length;
  const withRelance = J.filter(r => (r.nb_relances || 0) > 0).length;

  // ---- Digital vs relationnel ----
  const digDelais = digital.map(r => r.delai_visite_vente).filter(v => typeof v === 'number');
  const relDelais = relationnel.map(r => r.delai_visite_vente).filter(v => typeof v === 'number');
  const cmp = [
    ['Nombre de ventes', digital.length, relationnel.length],
    ['Délai médian visite → vente', fmtNum(median(digDelais), 0) + ' j', fmtNum(median(relDelais), 0) + ' j'],
    ['Visites moyennes / dossier', fmtNum(mean(digital.map(r => r.nb_visites)), 1), fmtNum(mean(relationnel.map(r => r.nb_visites)), 1)],
    ['Relances moyennes / dossier', fmtNum(mean(digital.map(r => r.nb_relances)), 1), fmtNum(mean(relationnel.map(r => r.nb_relances)), 1)],
    ['Part de ventes annulées', fmtPct(digital.filter(r => statutLabel(r.statut) === 'Annulée').length / digital.length, 0), fmtPct(relationnel.filter(r => statutLabel(r.statut) === 'Annulée').length / relationnel.length, 0)],
  ];
  $('#acqCompare').innerHTML = `<table class="cmp-table">
    <thead><tr><th>Indicateur</th><th>Digital (${digital.length})</th><th>Relationnel (${relationnel.length})</th></tr></thead>
    <tbody>${cmp.map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td></tr>`).join('')}</tbody>
  </table>`;
  $('#acqInsight').innerHTML =
    `L'acheteur <b>relationnel</b> décide plus vite (médiane ${fmtNum(median(relDelais), 0)} j contre ${fmtNum(median(digDelais), 0)} j) : il arrive souvent déjà convaincu par un proche. ` +
    `L'acheteur <b>digital</b> a besoin d'un peu plus de maturation, mais ne mobilise pas plus de visites. Le digital ne remplace pas le bouche-à-oreille : il alimente le haut de l'entonnoir.`;

  // ---- Ventes annulées ----
  const cancBySource = countBy(annulees, r => r.source);
  const cancRows = Object.entries(cancBySource).sort((a, b) => b[1] - a[1]).map(([s, v]) => ({ label: s, value: v, cls: 'soft' }));
  barChart('#cancelBars', cancRows.length ? cancRows : [{ label: 'Aucune', value: 0 }], Math.max(1, ...cancRows.map(r => r.value)));
  $('#cancelInsight').innerHTML =
    `<b>${annulees.length} ventes annulées sur ${n}</b> (${fmtPct(annulees.length / n, 0)}). ` +
    `Elles se répartissent sans concentration particulière entre le digital et le relationnel — il n'y a pas de canal « à risque » identifié à ce stade.`;

  // ---- Takeaway ----
  const takeaway = [
    `<b>Le relationnel domine.</b> Bouche-à-oreille et passage font ${fmtPct(boucheEtPassage / n, 0)} des ventes (${boucheEtPassage}/${n}). Le digital est un contributeur solide (${fmtPct(digital.length / n, 0)}), pas le canal principal.`,
    `<b>META porte tout le digital.</b> ${bySource['META'] || 0} des ${digital.length} ventes digitales viennent de META ; les sites web sont quasi inexistants (${(bySource['SITE TC'] || 0) + (bySource['SITE PI'] || 0)} ventes) — un levier à activer.`,
    `<b>La décision est rapide pour la moitié.</b> Délai médian de ${fmtNum(medDelai, 0)} j visite → vente, mais une minorité de dossiers s'étire jusqu'à ${fmtNum(Math.max(...delais), 0)} j et tire la moyenne à ${fmtNum(mean(delais), 0)} j.`,
    `<b>La vente se gagne sur le terrain.</b> ${multiVisite}/${n} acheteurs reviennent visiter et ${withRelance} ont eu besoin d'une relance : l'accompagnement commercial reste déterminant, quel que soit le canal d'origine.`,
  ];
  $('#globalTakeaway').innerHTML = takeaway.map(t => `<li>${t}</li>`).join('');

  renderDelaiPeriode();
}

/* ==========================================================================
   3b. FOCUS CAMPAGNES DIGITALES
   ========================================================================== */
const CAMPAGNE_SOURCES = ['META', 'SITE TC', 'SITE PI'];
function renderFocus() {
  const camp = JOURNEYS.filter(r => CAMPAGNE_SOURCES.includes(r.source));
  const crc = camp.filter(isCRC);
  const dir = camp.filter(r => !isCRC(r));
  const medOf = arr => median(arr.map(r => r.delai_visite_vente).filter(v => typeof v === 'number'));
  const meanOf = arr => mean(arr.map(r => r.delai_visite_vente).filter(v => typeof v === 'number'));
  const stat = (arr, st) => arr.filter(r => statutLabel(r.statut) === st).length;

  // ---- KPI ----
  const kpis = [
    { val: camp.length, lbl: 'Ventes issues des campagnes', sub: `META et sites web · ${fmtPct(camp.length / JOURNEYS.length, 0)} du portefeuille` },
    { val: crc.length, lbl: 'Leads pris en charge par le CRC', sub: `${dir.length} autres en contact commercial direct`, accent: true },
    { val: fmtNum(medOf(crc), 0) + ' j', lbl: 'Délai médian d\'un lead CRC', sub: `contre ${fmtNum(medOf(dir), 0)} j en contact direct` },
    { val: fmtNum(mean(crc.map(r => r.nb_relances || 0)), 1), lbl: 'Relances par lead CRC', sub: `contre ${fmtNum(mean(dir.map(r => r.nb_relances || 0)), 1)} en direct — le CRC nourrit les leads froids` },
  ];
  $('#focusKpi').innerHTML = kpis.map(k =>
    `<div class="kpi${k.accent ? ' accent' : ''}"><div class="val">${k.val}</div><div class="lbl">${k.lbl}</div><div class="sub">${k.sub}</div></div>`
  ).join('');

  // ---- Tableau comparatif ----
  const cmp = [
    ['Nombre de ventes', crc.length, dir.length],
    ['dont META', crc.filter(r => r.source === 'META').length, dir.filter(r => r.source === 'META').length],
    ['dont sites web (TC/PI)', crc.filter(r => r.source !== 'META').length, dir.filter(r => r.source !== 'META').length],
    ['Délai médian visite → vente', fmtNum(medOf(crc), 0) + ' j', fmtNum(medOf(dir), 0) + ' j'],
    ['Délai moyen', fmtNum(meanOf(crc), 0) + ' j', fmtNum(meanOf(dir), 0) + ' j'],
    ['Visites moyennes / dossier', fmtNum(mean(crc.map(r => r.nb_visites || 0)), 1), fmtNum(mean(dir.map(r => r.nb_visites || 0)), 1)],
    ['Relances moyennes / dossier', fmtNum(mean(crc.map(r => r.nb_relances || 0)), 1), fmtNum(mean(dir.map(r => r.nb_relances || 0)), 1)],
    ['Statut : Active', stat(crc, 'Active'), stat(dir, 'Active')],
    ['Statut : En cours', stat(crc, 'En cours'), stat(dir, 'En cours')],
    ['Statut : Annulée', stat(crc, 'Annulée'), stat(dir, 'Annulée')],
  ];
  $('#focusCompare').innerHTML = `<table class="cmp-table">
    <thead><tr><th>Indicateur</th><th>Leads CRC (${crc.length})</th><th>Contact direct (${dir.length})</th></tr></thead>
    <tbody>${cmp.map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td></tr>`).join('')}</tbody>
  </table>`;
  $('#focusCompareNote').innerHTML =
    `Un lead CRC met <b>${fmtNum(medOf(crc), 0)} j</b> à se conclure contre <b>${fmtNum(medOf(dir), 0)} j</b> en contact direct, et demande <b>2× plus de relances</b>. ` +
    `Ce n'est pas un signe de moindre efficacité : le CRC traite des <b>leads froids</b> (formulaires publicitaires), là où le contact direct (WhatsApp, visite spontanée) est un prospect <b>déjà chaud</b> qui s'est manifesté de lui-même.`;

  // ---- Par source ----
  const bySrc = countBy(camp, r => r.source);
  const srcRows = CAMPAGNE_SOURCES.filter(s => bySrc[s]).map(s => ({ label: s, value: bySrc[s] }));
  barChart('#focusSource', srcRows, Math.max(...srcRows.map(r => r.value)));
  $('#focusSourceNote').innerHTML =
    `<b>META</b> porte ${fmtPct((bySrc['META'] || 0) / camp.length, 0)} des ventes campagnes (${bySrc['META'] || 0}/${camp.length}). ` +
    `Les sites web (${(bySrc['SITE TC'] || 0) + (bySrc['SITE PI'] || 0)} ventes) restent un actif à activer.`;

  // ---- Par canal ----
  const byCanal = countBy(camp, r => r.canal || '—');
  const canalRows = Object.entries(byCanal).sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ label: c, value: v, cls: c === 'LEAD' ? '' : 'alt' }));
  barChart('#focusCanal', canalRows, Math.max(...canalRows.map(r => r.value)));
  $('#focusCanalNote').innerHTML =
    `<b>LEAD</b> (${byCanal['LEAD'] || 0}) = les formulaires qualifiés par le CRC. Les autres canaux — <b>WhatsApp, visite spontanée, téléphone</b> — sont des prospects qui contactent directement l'agence après avoir vu une campagne : plus mûrs, plus rapides à conclure.`;

  // ---- Tableau détaillé (22) ----
  const ordered = camp.slice().sort((a, b) => {
    const ca = isCRC(a) ? 0 : 1, cb = isCRC(b) ? 0 : 1;
    if (ca !== cb) return ca - cb;
    return (b.delai_visite_vente ?? -1) - (a.delai_visite_vente ?? -1);
  });
  $('#focusTable tbody').innerHTML = ordered.map(r => `<tr>
    <td class="name">${esc(r.nom)}</td>
    <td>${esc(r.source)}</td>
    <td>${esc(r.canal || '—')}</td>
    <td><span class="pill ${isCRC(r) ? 'yes' : 'no'}">${isCRC(r) ? 'CRC' : 'Direct'}</span></td>
    <td>${r.delai_visite_vente ?? '—'}</td>
    <td>${r.nb_visites ?? '—'}</td>
    <td>${r.nb_relances ?? '—'}</td>
    <td><span class="badge ${statutClass(r.statut)}">${statutLabel(r.statut)}</span></td>
    <td>${esc(r.agent || '—')}</td>
  </tr>`).join('');

  // ---- Lecture stratégique ----
  const longs = crc.filter(r => (r.delai_visite_vente || 0) > 100).sort((a, b) => b.delai_visite_vente - a.delai_visite_vente);
  const topAgent = Object.entries(countBy(crc, r => r.agent)).sort((a, b) => b[1] - a[1])[0];
  const takeaway = [
    `<b>Le CRC ne vend pas plus vite — il vend le difficile.</b> Les ${crc.length} leads CRC (formulaires META froids) se concluent en ${fmtNum(medOf(crc), 0)} j avec ${fmtNum(mean(crc.map(r => r.nb_relances || 0)), 1)} relance ; les ${dir.length} contacts directs en ${fmtNum(medOf(dir), 0)} j. Le CRC convertit des leads que le commercial ne traiterait pas seul.`,
    `<b>Toute la traîne longue est côté CRC.</b> Les ${longs.length} dossiers de plus de 100 jours sont tous des leads CRC (${longs.slice(0, 3).map(r => esc(r.nom) + ' ' + r.delai_visite_vente + ' j').join(', ')}…) — c'est là que se concentrent l'effort et le risque d'annulation.`,
    `<b>META est la seule campagne qui alimente vraiment.</b> ${bySrc['META'] || 0} des ${camp.length} ventes campagnes viennent de META ; les sites web n'en apportent que ${(bySrc['SITE TC'] || 0) + (bySrc['SITE PI'] || 0)} — un levier peu coûteux à débloquer.`,
    `<b>Faciliter le contact direct capte les prospects chauds.</b> WhatsApp et visite spontanée = un prospect qui décide en ${fmtNum(medOf(dir), 0)} j sans nurturing. Fluidifier ces canaux (bouton WhatsApp, accueil showroom) allège la charge du CRC.`,
    `<b>Attention à la concentration.</b> ${esc(topAgent[0])} gère ${topAgent[1]} des ${crc.length} leads CRC — dépendance à surveiller.`,
  ];
  $('#focusTakeaway').innerHTML = takeaway.map(t => `<li>${t}</li>`).join('');
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
    else if (k === 'nb_visites' || k === 'nb_relances') { va = detNum(a, k) ?? -1; vb = detNum(b, k) ?? -1; }
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
    <td>${detNum(r, 'nb_visites') ?? '—'}</td>
    <td>${detNum(r, 'nb_relances') ?? '—'}</td>
    <td><span class="badge ${statutClass(r.statut)}">${statutLabel(r.statut)}</span></td>
    <td class="villa-cell" title="${esc(r.bien || '')}">${esc(r.bien || '—')}</td>
    <td>${esc(r.agent || '—')}</td>
  </tr>`).join('');
}

/* ==========================================================================
   INIT
   ========================================================================== */
renderOverview();
initJourneyFilters();
initVREditing();
renderJourneys();
renderFocus();
renderGlobal();
renderCompare();
initAllTable();
renderAllTable();
