"""Genere la revue quotidienne (HTML + texte) organisee par pays.

La revue reprend les articles publies dans les dernieres 24h (par defaut),
regroupes par pays (pays tries par nombre d'articles decroissant).
"""

from datetime import datetime, timezone, timedelta

from . import themes as themes_mod

# Couleurs de la charte Perla Group
NAVY = "#1a345c"
NAVY_SOFT = "#2e4a78"
SILVER = "#d8dde1"
MUTED = "#6b7a8a"

TOP_PER_COUNTRY = 5  # nb d'articles "essentiels" retenus par pays (reglable via config)

# Pays prioritaire : place en tete de la revue (base de l'entreprise)
PRIORITY_COUNTRIES = ["Maroc"]

# Sources de reference (medias reconnus) -> bonus de notoriete dans le score
TOP_SOURCES = {
    # France
    "lesechos.fr", "lefigaro.fr", "immobilier.lefigaro.fr", "lemonde.fr", "leparisien.fr",
    "latribune.fr", "bfmtv.com", "capital.fr", "challenges.fr", "mysweetimmo.com", "businessimmo.com",
    # Belgique
    "lesoir.be", "lecho.be", "rtbf.be", "lalibre.be",
    # Suisse
    "letemps.ch", "bilan.ch", "rts.ch", "24heures.ch", "allnews.ch",
    # Maroc
    "leseco.ma", "medias24.com", "lematin.ma", "lavieeco.com", "telquel.ma", "hespress.com",
    "mapexpress.ma", "challenge.ma", "aujourdhui.ma", "leconomiste.com", "boursenews.ma", "le360.ma",
    # Emirats
    "thenationalnews.com", "gulfnews.com", "khaleejtimes.com", "arabianbusiness.com", "zawya.com",
    # Royaume-Uni
    "ft.com", "theguardian.com", "telegraph.co.uk", "bbc.com", "bbc.co.uk", "reuters.com",
    "estateagenttoday.co.uk", "propertyweek.com", "cityam.com",
    # Etats-Unis
    "bloomberg.com", "wsj.com", "nytimes.com", "cnbc.com", "forbes.com", "realtor.com",
    "housingwire.com", "bisnow.com",
    # Espagne
    "elpais.com", "expansion.com", "cincodias.elpais.com", "eleconomista.es", "idealista.com",
    "elmundo.es", "abc.es",
    # Canada
    "theglobeandmail.com", "financialpost.com", "cbc.ca", "lapresse.ca",
    "journaldemontreal.com", "bnnbloomberg.ca",
}


def _esc(s):
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def _parse(ts):
    try:
        dt = datetime.fromisoformat(ts)
    except (TypeError, ValueError):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def recent_articles(articles, hours=24):
    """Articles publies (ou collectes a defaut) dans les dernieres `hours` heures."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    out = []
    for a in articles:
        dt = _parse(a.get("published") or a.get("collected_at") or "")
        if dt and dt >= cutoff:
            out.append(a)
    return out


def _fmt_date(ts):
    dt = _parse(ts)
    if not dt:
        return ""
    mois = ["janv.", "fevr.", "mars", "avril", "mai", "juin",
            "juil.", "aout", "sept.", "oct.", "nov.", "dec."]
    return "%02d %s" % (dt.day, mois[dt.month - 1])


def _group_by_country(articles):
    groups = {}
    for a in articles:
        groups.setdefault(a.get("country", "Autre"), []).append(a)
    for items in groups.values():
        items.sort(key=lambda a: a.get("published", ""), reverse=True)
    # pays tries par nombre d'articles decroissant
    return sorted(groups.items(), key=lambda kv: len(kv[1]), reverse=True)


def _is_classified(a):
    return a.get("primary_theme") and a.get("primary_theme") != themes_mod.UNCLASSIFIED


def _recency_score(a):
    """0..1 : 1 = tres recent, decroit sur 24h."""
    dt = _parse(a.get("published") or a.get("collected_at") or "")
    if not dt:
        return 0.0
    age_h = (datetime.now(timezone.utc) - dt).total_seconds() / 3600.0
    return max(0.0, 1.0 - age_h / 24.0)


def _score(a, coverage, max_buzz):
    """Score d'importance = reprise media (buzz) + notoriete source + fraicheur (departage)."""
    key = a.get("dedup_key")
    # buzz = reprises dans le meme pays (mentions) + couverture multi-pays (coverage)
    buzz_raw = (a.get("mentions", 1) - 1) + (coverage.get(key, 1) - 1)
    buzz = (buzz_raw / max_buzz) if max_buzz else 0.0
    notoriety = 1.0 if a.get("media_domain") in TOP_SOURCES else 0.0
    recency = _recency_score(a)
    return 3.0 * buzz + 2.0 * notoriety + 0.5 * recency


def build_digest(articles, site_url="", hours=24, top_per_country=TOP_PER_COUNTRY):
    """Revue "essentiel" : uniquement les articles classes, les plus recents par pays.

    Retourne (subject, html, text, count) ou count = nb d'articles retenus (affiches).
    """
    recent = recent_articles(articles, hours)
    # On ne garde que les articles pertinents (classes par thematique)
    classified = [a for a in recent if _is_classified(a)]
    # Nombre total (recents, tous confondus) par pays — pour la mention "+ X autres"
    total_by_country = {}
    for a in recent:
        total_by_country[a.get("country", "Autre")] = total_by_country.get(a.get("country", "Autre"), 0) + 1

    today = datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=1)))  # heure Maroc (UTC+1)
    date_label = today.strftime("%d/%m/%Y")

    # Couverture multi-pays : combien de fois un meme sujet apparait (tous pays confondus)
    coverage = {}
    for a in recent:
        k = a.get("dedup_key")
        coverage[k] = coverage.get(k, 0) + 1
    # buzz max observe (pour normaliser le score)
    max_buzz = 1
    for a in classified:
        b = (a.get("mentions", 1) - 1) + (coverage.get(a.get("dedup_key"), 1) - 1)
        max_buzz = max(max_buzz, b)

    # Regroupement par pays, tri interne par SCORE d'importance decroissant
    by_country = {}
    for a in classified:
        by_country.setdefault(a.get("country", "Autre"), []).append(a)
    for items in by_country.values():
        items.sort(key=lambda a: _score(a, coverage, max_buzz), reverse=True)

    # Ordre des pays : pays prioritaires d'abord, puis par nombre d'articles decroissant
    def _country_rank(country):
        if country in PRIORITY_COUNTRIES:
            return (0, PRIORITY_COUNTRIES.index(country))
        return (1, -len(by_country[country]))
    ordered_countries = sorted(by_country.keys(), key=_country_rank)

    # Selection : top N par pays
    selection = [(country, by_country[country][:top_per_country],
                  total_by_country.get(country, len(by_country[country])))
                 for country in ordered_countries]
    count = sum(len(items) for _, items, _ in selection)

    subject = "Veille Immobilière Perla Group — %s · l'essentiel (%d article%s)" % (
        date_label, count, "s" if count > 1 else "")

    # ---- Corps HTML ----
    blocks = []
    for country, items, total in selection:
        rows = []
        for a in items:
            theme = a.get("primary_theme", "")
            theme_html = ('<span style="display:inline-block;background:#e6edf5;color:%s;'
                          'border-radius:999px;padding:2px 9px;font-size:12px;margin-right:6px;">%s</span>'
                          % (NAVY, _esc(theme))) if theme else ""
            meta_bits = []
            if a.get("media"):
                meta_bits.append(_esc(a["media"]))
            if a.get("language_label"):
                meta_bits.append(_esc(a["language_label"]))
            if a.get("published"):
                meta_bits.append(_fmt_date(a["published"]))
            meta = " · ".join(meta_bits)
            rows.append(
                '<tr><td style="padding:10px 0;border-bottom:1px solid #eef1f4;">'
                '<a href="%s" style="color:%s;font-weight:600;font-size:15px;text-decoration:none;">%s</a>'
                '<div style="margin-top:4px;">%s'
                '<span style="color:%s;font-size:12px;">%s</span></div>'
                '</td></tr>'
                % (_esc(a.get("link", "")), NAVY, _esc(a.get("title", "")),
                   theme_html, MUTED, meta)
            )
        extra = ""
        if total > len(items):
            extra = ('<div style="margin-top:8px;"><a href="%s" style="color:%s;font-size:12px;">'
                     '+ %d autre(s) article(s) sur le tableau de bord →</a></div>'
                     % (_esc(site_url or "#"), NAVY_SOFT, total - len(items)))
        blocks.append(
            '<div style="margin:26px 0 0;">'
            '<h2 style="font-size:18px;color:%s;margin:0 0 6px;border-bottom:2px solid %s;padding-bottom:6px;">'
            '%s <span style="color:%s;font-size:13px;font-weight:400;">%d à la une</span></h2>'
            '<table role="presentation" width="100%%" cellpadding="0" cellspacing="0">%s</table>%s'
            '</div>'
            % (NAVY, SILVER, _esc(country), MUTED, len(items), "".join(rows), extra)
        )

    body_inner = "".join(blocks) if blocks else (
        '<p style="color:%s;">Aucun article marquant dans les dernieres 24 heures.</p>' % MUTED)

    site_btn = ""
    if site_url:
        site_btn = ('<div style="margin-top:32px;text-align:center;">'
                    '<a href="%s" style="background:%s;color:#fff;text-decoration:none;'
                    'padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block;">'
                    'Voir tous les articles sur le tableau de bord</a></div>' % (_esc(site_url), NAVY))

    html = (
        '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"></head>'
        '<body style="margin:0;background:#f6f8fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c2733;">'
        '<div style="max-width:640px;margin:0 auto;padding:24px;">'
        '<div style="background:%s;border-radius:12px;padding:22px 24px;color:#fff;">'
        '<div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;opacity:.85;">Perla Group</div>'
        '<div style="font-size:22px;font-weight:700;margin-top:4px;">Veille Immobilière</div>'
        '<div style="font-size:14px;opacity:.9;margin-top:4px;">L\'essentiel du %s — %d article%s à la une</div>'
        '</div>'
        '<div style="background:#fff;border:1px solid #e2e7ec;border-top:none;border-radius:0 0 12px 12px;padding:8px 24px 28px;">'
        '%s%s'
        '</div>'
        '<div style="color:%s;font-size:12px;text-align:center;margin-top:18px;">'
        'Revue de presse internationale — presse ecrite &amp; publicitaire · Perla Group'
        '</div>'
        '</div></body></html>'
        % (NAVY, date_label, count, "s" if count > 1 else "", body_inner, site_btn, MUTED)
    )

    # ---- Version texte (repli) ----
    text_lines = ["Veille Immobilière Perla Group — L'essentiel du %s (%d articles à la une)"
                  % (date_label, count), ""]
    for country, items, total in selection:
        text_lines.append("== %s ==" % country)
        for a in items:
            text_lines.append("- %s" % a.get("title", ""))
            text_lines.append("  %s" % a.get("link", ""))
        if total > len(items):
            text_lines.append("  (+ %d autre(s) sur le tableau de bord)" % (total - len(items)))
        text_lines.append("")
    if site_url:
        text_lines.append("Tableau de bord complet : " + site_url)
    text = "\n".join(text_lines)

    return subject, html, text, count
