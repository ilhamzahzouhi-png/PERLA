const $ = (id) => document.getElementById(id);

const state = {
  all: [],        // tous les articles (charges une fois)
  filters: null,  // pays / langues / themes
  countries: [], language: "", theme: "", q: "", from: "", to: "", group: true,
};
let searchTimer = null;

const UNCLASSIFIED = "Non classé";

async function api(path) {
  const res = await fetch(path, { cache: "no-store" });
  return res.json();
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function thumbHtml(a) {
  const initial = escapeHtml((a.media || a.country || "?").trim().charAt(0).toUpperCase());
  if (a.media_domain) {
    const d = encodeURIComponent(a.media_domain);
    const google = "https://www.google.com/s2/favicons?sz=128&domain=" + d;
    const ddg = "https://icons.duckduckgo.com/ip3/" + d + ".ico";
    // Essaie Google, puis DuckDuckGo, puis retombe sur l'initiale.
    const onerr = "if(!this.dataset.fb){this.dataset.fb=1;this.src='" + ddg + "';}"
      + "else{this.parentNode.classList.add('thumb-fallback');this.remove();}";
    return `<div class="thumb"><img src="${google}" alt="${escapeHtml(a.media)}" loading="lazy"
      onerror="${onerr}"><span class="thumb-i">${initial}</span></div>`;
  }
  return `<div class="thumb thumb-fallback"><span class="thumb-i">${initial}</span></div>`;
}

function featCardHtml(a) {
  const theme = a.primary_theme && a.primary_theme !== UNCLASSIFIED
    ? `<span class="chip theme">${escapeHtml(a.primary_theme)}</span>` : "";
  return `
    <article class="feat-card" data-href="${escapeHtml(a.link)}">
      <div class="feat-head">
        ${thumbHtml(a)}
        <h3><a href="${escapeHtml(a.link)}" target="_blank" rel="noopener">${escapeHtml(a.title)}</a></h3>
      </div>
      <div class="meta">
        <span class="chip country">${escapeHtml(a.country)}</span>
        ${theme}
        ${a.media ? `<span class="media">${escapeHtml(a.media)}</span>` : ""}
        <span class="date">${fmtDate(a.published)}</span>
      </div>
    </article>`;
}

function cardHtml(a) {
  const themes = (a.themes || []).map((t) => `<span class="chip theme">${escapeHtml(t)}</span>`).join("");
  return `
      <article class="card" data-href="${escapeHtml(a.link)}">
        <div class="card-body">
          ${thumbHtml(a)}
          <div class="card-main">
            <h3><a href="${escapeHtml(a.link)}" target="_blank" rel="noopener">${escapeHtml(a.title)}</a></h3>
            ${a.description ? `<p class="desc">${escapeHtml(a.description).slice(0, 220)}</p>` : ""}
            <div class="meta">
              <span class="chip country">${escapeHtml(a.country)}</span>
              <span class="chip lang">${escapeHtml(a.language_label || a.language)}</span>
              ${themes}
              ${a.media ? `<span class="media">${escapeHtml(a.media)}</span>` : ""}
              <span class="date">${fmtDate(a.published)}</span>
            </div>
          </div>
        </div>
      </article>`;
}

function renderArticles(articles) {
  const box = $("articles");
  const empty = $("empty");
  if (!articles.length) {
    box.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  if (!state.group) {
    box.innerHTML = articles.map(cardHtml).join("");
    return;
  }

  const groups = {};
  articles.forEach((a) => { (groups[a.country] = groups[a.country] || []).push(a); });
  const ordered = Object.keys(groups).sort((x, y) => groups[y].length - groups[x].length);
  box.innerHTML = ordered.map((country) => {
    const items = groups[country];
    return `
      <div class="group-head">
        <h2>${escapeHtml(country)}</h2>
        <span class="group-count">${items.length} article${items.length > 1 ? "s" : ""}</span>
      </div>
      ${items.map(cardHtml).join("")}`;
  }).join("");
}

function filterArticles() {
  const q = state.q.toLowerCase();
  return state.all.filter((a) => {
    if (state.countries.length && !state.countries.includes(a.country)) return false;
    if (state.language && a.language !== state.language) return false;
    if (state.theme && !(a.themes || []).includes(state.theme)) return false;
    if (q && !((a.title || "") + " " + (a.description || "")).toLowerCase().includes(q)) return false;
    if (state.from || state.to) {
      const day = (a.published || "").slice(0, 10);
      if (!day) return false;
      if (state.from && day < state.from) return false;
      if (state.to && day > state.to) return false;
    }
    return true;
  });
}

function applyFilters() {
  const result = filterArticles();
  $("resultCount").textContent = result.length + " article" + (result.length > 1 ? "s" : "");
  renderArticles(result);
}

function renderStats() {
  const distinct = (mapFn) => {
    const m = {};
    state.all.forEach((a) => mapFn(a).forEach((v) => { if (v) m[v] = true; }));
    return Object.keys(m).length;
  };
  const nbCountries = distinct((a) => [a.country]);
  const nbLanguages = distinct((a) => [a.language_label || a.language]);
  const nbThemes = distinct((a) => (a.themes || []).filter((t) => t !== UNCLASSIFIED));
  $("stats").innerHTML = `
    <div class="stat-card"><div class="num">${state.all.length}</div><div class="lbl">Articles collectés</div></div>
    <div class="stat-card"><div class="num">${nbCountries}</div><div class="lbl">Pays</div></div>
    <div class="stat-card"><div class="num">${nbLanguages}</div><div class="lbl">Langues</div></div>
    <div class="stat-card"><div class="num">${nbThemes}</div><div class="lbl">Thématiques actives</div></div>
  `;
}

function renderHighlights() {
  const classified = state.all
    .filter((a) => a.primary_theme && a.primary_theme !== UNCLASSIFIED)
    .slice()
    .sort((a, b) => (b.published || "").localeCompare(a.published || ""));
  const limit = 6;
  const picked = [], usedCountries = new Set();
  for (const a of classified) {
    if (!usedCountries.has(a.country)) { picked.push(a); usedCountries.add(a.country); }
    if (picked.length >= limit) break;
  }
  if (picked.length < limit) {
    const inPicked = new Set(picked);
    for (const a of classified) {
      if (!inPicked.has(a)) picked.push(a);
      if (picked.length >= limit) break;
    }
  }
  const box = $("featured");
  const section = $("featuredSection");
  if (!picked.length) { section.classList.add("hidden"); return; }
  section.classList.remove("hidden");
  box.innerHTML = picked.map(featCardHtml).join("");
}

function buildFilterMenus() {
  const cc = $("countryChecks");
  cc.innerHTML = state.filters.countries.map((c) =>
    `<label><input type="checkbox" class="country-check" value="${escapeHtml(c)}"> ${escapeHtml(c)}</label>`
  ).join("");
  cc.querySelectorAll(".country-check").forEach((cb) => {
    cb.addEventListener("change", () => {
      state.countries = Array.from(cc.querySelectorAll(".country-check:checked")).map((x) => x.value);
      applyFilters();
    });
  });
  const ls = $("languageSelect");
  state.filters.languages.forEach((l) => ls.add(new Option(l.label, l.code)));
  const ts = $("themeSelect");
  state.filters.themes.forEach((t) => ts.add(new Option(t, t)));
}

function toISO(d) { return d.toISOString().slice(0, 10); }

function applyPeriod(preset) {
  const fromEl = $("dateFrom");
  const toEl = $("dateTo");
  if (preset === "" || preset === "custom") {
    if (preset === "") { fromEl.value = ""; toEl.value = ""; }
    state.from = fromEl.value;
    state.to = toEl.value;
    return;
  }
  const now = new Date();
  const to = toISO(now);
  let from = to;
  if (preset === "7") { const d = new Date(now); d.setDate(d.getDate() - 6); from = toISO(d); }
  else if (preset === "30") { const d = new Date(now); d.setDate(d.getDate() - 29); from = toISO(d); }
  fromEl.value = from;
  toEl.value = to;
  state.from = from;
  state.to = to;
}

function wire() {
  document.addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    const card = e.target.closest("[data-href]");
    if (card && card.dataset.href) window.open(card.dataset.href, "_blank", "noopener");
  });
  $("languageSelect").addEventListener("change", (e) => { state.language = e.target.value; applyFilters(); });
  $("themeSelect").addEventListener("change", (e) => { state.theme = e.target.value; applyFilters(); });
  $("searchInput").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = e.target.value.trim(); applyFilters(); }, 250);
  });
  $("groupToggle").addEventListener("change", (e) => { state.group = e.target.checked; applyFilters(); });
  $("periodSelect").addEventListener("change", (e) => { applyPeriod(e.target.value); applyFilters(); });
  $("dateFrom").addEventListener("change", (e) => {
    state.from = e.target.value; $("periodSelect").value = "custom"; applyFilters();
  });
  $("dateTo").addEventListener("change", (e) => {
    state.to = e.target.value; $("periodSelect").value = "custom"; applyFilters();
  });
  $("resetBtn").addEventListener("click", () => {
    state.countries = [];
    state.language = state.theme = state.q = state.from = state.to = "";
    document.querySelectorAll(".country-check").forEach((cb) => { cb.checked = false; });
    $("languageSelect").value = "";
    $("themeSelect").value = ""; $("searchInput").value = "";
    $("periodSelect").value = ""; $("dateFrom").value = ""; $("dateTo").value = "";
    applyFilters();
  });
}

(async function init() {
  wire();
  const [articles, filters, meta] = await Promise.all([
    api("data/articles.json"),
    api("data/filters.json"),
    api("data/meta.json").catch(() => null),
  ]);
  state.all = Array.isArray(articles) ? articles : [];
  state.filters = filters;
  buildFilterMenus();
  renderStats();
  renderHighlights();
  applyFilters();
  if (meta && meta.last_updated) {
    $("lastUpdated").textContent = "Dernière mise à jour : " + fmtDateTime(meta.last_updated);
  }
})();
