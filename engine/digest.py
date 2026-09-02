"""Genere la revue quotidienne (HTML + texte) organisee par pays.

La revue reprend les articles publies dans les dernieres 24h (par defaut),
regroupes par pays (pays tries par nombre d'articles decroissant).
"""

from datetime import datetime, timezone, timedelta

# Couleurs de la charte Perla Group
NAVY = "#1a345c"
NAVY_SOFT = "#2e4a78"
SILVER = "#d8dde1"
MUTED = "#6b7a8a"

MAX_PER_COUNTRY = 12  # limite d'articles affiches par pays (email digeste)


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


def build_digest(articles, site_url="", hours=24):
    """Retourne (subject, html, text, count)."""
    recent = recent_articles(articles, hours)
    today = datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=1)))  # heure Maroc (UTC+1)
    date_label = today.strftime("%d/%m/%Y")
    count = len(recent)
    grouped = _group_by_country(recent)

    subject = "Veille Immobilier Perla Group — %s (%d article%s)" % (
        date_label, count, "s" if count > 1 else "")

    # ---- Corps HTML ----
    blocks = []
    for country, items in grouped:
        rows = []
        for a in items[:MAX_PER_COUNTRY]:
            theme = a.get("primary_theme", "")
            theme_html = ""
            if theme and theme != "Non classe" and theme != "Non classé":
                theme_html = ('<span style="display:inline-block;background:#e6edf5;color:%s;'
                              'border-radius:999px;padding:2px 9px;font-size:12px;margin-right:6px;">%s</span>'
                              % (NAVY, _esc(theme)))
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
        if len(items) > MAX_PER_COUNTRY:
            extra = ('<div style="color:%s;font-size:12px;margin-top:8px;">+ %d autre(s) article(s)</div>'
                     % (MUTED, len(items) - MAX_PER_COUNTRY))
        blocks.append(
            '<div style="margin:26px 0 0;">'
            '<h2 style="font-size:17px;color:%s;margin:0 0 6px;border-bottom:2px solid %s;padding-bottom:6px;">'
            '%s <span style="color:%s;font-size:13px;font-weight:400;">%d article%s</span></h2>'
            '<table role="presentation" width="100%%" cellpadding="0" cellspacing="0">%s</table>%s'
            '</div>'
            % (NAVY, SILVER, _esc(country), MUTED, len(items),
               "s" if len(items) > 1 else "", "".join(rows), extra)
        )

    body_inner = "".join(blocks) if blocks else (
        '<p style="color:%s;">Aucun nouvel article dans les dernieres 24 heures.</p>' % MUTED)

    site_btn = ""
    if site_url:
        site_btn = ('<div style="margin-top:32px;text-align:center;">'
                    '<a href="%s" style="background:%s;color:#fff;text-decoration:none;'
                    'padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block;">'
                    'Ouvrir le tableau de bord complet</a></div>' % (_esc(site_url), NAVY))

    html = (
        '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"></head>'
        '<body style="margin:0;background:#f6f8fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c2733;">'
        '<div style="max-width:640px;margin:0 auto;padding:24px;">'
        '<div style="background:%s;border-radius:12px;padding:22px 24px;color:#fff;">'
        '<div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;opacity:.85;">Perla Group</div>'
        '<div style="font-size:22px;font-weight:700;margin-top:4px;">Veille Immobilier</div>'
        '<div style="font-size:14px;opacity:.9;margin-top:4px;">Revue du %s — %d article%s</div>'
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
    text_lines = ["Veille Immobilier Perla Group — Revue du %s (%d articles)" % (date_label, count), ""]
    for country, items in grouped:
        text_lines.append("== %s (%d) ==" % (country, len(items)))
        for a in items[:MAX_PER_COUNTRY]:
            text_lines.append("- %s" % a.get("title", ""))
            text_lines.append("  %s" % a.get("link", ""))
        text_lines.append("")
    if site_url:
        text_lines.append("Tableau de bord complet : " + site_url)
    text = "\n".join(text_lines)

    return subject, html, text, count
