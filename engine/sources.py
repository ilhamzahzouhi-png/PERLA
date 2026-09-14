"""Configuration des pays, langues et requetes Google News."""

# Terme de base "immobilier" par langue
BASE_QUERY = {
    "fr": "immobilier",
    "en": "real estate",
    "ar": "عقارات",
    "es": "sector inmobiliario",
}

LANG_LABEL = {
    "fr": "Français",
    "en": "Anglais",
    "ar": "Arabe",
    "es": "Espagnol",
}

# Pays surveilles : code pays Google (gl) + langues + terme geographique (geo)
# Le terme "geo" est AJOUTE a la requete pour ancrer les resultats au pays
# (ex. "immobilier Maroc"), sinon Google renvoie de l'actu generique dans la
# langue demandee (beaucoup d'articles France se retrouvaient dans "Maroc").
COUNTRIES = [
    {"name": "France",         "gl": "FR", "langs": ["fr"],       "geo": {"fr": "France"}},
    {"name": "Belgique",       "gl": "BE", "langs": ["fr"],       "geo": {"fr": "Belgique"}},
    {"name": "Suisse",         "gl": "CH", "langs": ["fr"],       "geo": {"fr": "Suisse"}},
    {"name": "Maroc",          "gl": "MA", "langs": ["fr", "ar"], "geo": {"fr": "Maroc", "ar": "المغرب"}},
    {"name": "Émirats (Dubaï)", "gl": "AE", "langs": ["en", "ar"], "geo": {"en": "UAE", "ar": "الإمارات"}},
    {"name": "Royaume-Uni",    "gl": "GB", "langs": ["en"],       "geo": {"en": "UK"}},
    {"name": "États-Unis",     "gl": "US", "langs": ["en"],       "geo": {"en": "USA"}},
    {"name": "Espagne",        "gl": "ES", "langs": ["es"],       "geo": {"es": "España"}},
    {"name": "Canada",         "gl": "CA", "langs": ["fr", "en"], "geo": {"fr": "Canada", "en": "Canada"}},
]


def build_sources():
    """Retourne la liste des (pays, langue, url RSS) a interroger."""
    sources = []
    for c in COUNTRIES:
        for lang in c["langs"]:
            geo = c.get("geo", {}).get(lang, "")
            q = (BASE_QUERY[lang] + " " + geo).strip() if geo else BASE_QUERY[lang]
            url = (
                "https://news.google.com/rss/search?"
                "q=" + _url_encode(q)
                + "&hl=" + lang
                + "&gl=" + c["gl"]
                + "&ceid=" + c["gl"] + ":" + lang
            )
            sources.append({
                "country": c["name"],
                "gl": c["gl"],
                "language": lang,
                "language_label": LANG_LABEL[lang],
                "url": url,
            })
    return sources


def _url_encode(s):
    from urllib.parse import quote
    return quote(s)
