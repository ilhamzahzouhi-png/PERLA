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

# Pays surveilles : code pays Google (gl) + langues a interroger
COUNTRIES = [
    {"name": "France",         "gl": "FR", "langs": ["fr"]},
    {"name": "Belgique",       "gl": "BE", "langs": ["fr"]},
    {"name": "Suisse",         "gl": "CH", "langs": ["fr"]},
    {"name": "Maroc",          "gl": "MA", "langs": ["fr", "ar"]},
    {"name": "Émirats (Dubaï)", "gl": "AE", "langs": ["en", "ar"]},
    {"name": "Royaume-Uni",    "gl": "GB", "langs": ["en"]},
    {"name": "États-Unis",     "gl": "US", "langs": ["en"]},
    {"name": "Espagne",        "gl": "ES", "langs": ["es"]},
    {"name": "Canada",         "gl": "CA", "langs": ["fr", "en"]},
]


def build_sources():
    """Retourne la liste des (pays, langue, url RSS) a interroger."""
    sources = []
    for c in COUNTRIES:
        for lang in c["langs"]:
            q = BASE_QUERY[lang]
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
