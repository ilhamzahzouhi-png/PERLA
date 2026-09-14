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


# ---------------------------------------------------------------------------
# Fiabilite geographique : un article n'est rattache a un pays que s'il y a une
# PREUVE qu'il le concerne (domaine national, media reconnu, ou nom pays/ville).
# Cela evite qu'un article France se retrouve classe "Maroc", etc.
# ---------------------------------------------------------------------------

# Domaines de premier niveau (TLD) propres a chaque pays
GEO_TLDS = {
    "France": [".fr"],
    "Belgique": [".be"],
    "Suisse": [".ch"],
    "Maroc": [".ma"],
    "Émirats (Dubaï)": [".ae"],
    "Royaume-Uni": [".co.uk", ".uk"],
    "États-Unis": [".us"],
    "Espagne": [".es"],
    "Canada": [".ca"],
}

# Medias nationaux reconnus (souvent en .com) -> preuve d'appartenance au pays
GEO_DOMAINS = {
    "France": {"lesechos.fr", "lefigaro.fr", "immobilier.lefigaro.fr", "lemonde.fr",
               "leparisien.fr", "latribune.fr", "bfmtv.com", "capital.fr", "challenges.fr",
               "mysweetimmo.com", "businessimmo.com", "seloger.com", "meilleursagents.com", "pap.fr"},
    "Belgique": {"lesoir.be", "lecho.be", "rtbf.be", "lalibre.be"},
    "Suisse": {"letemps.ch", "bilan.ch", "rts.ch", "24heures.ch", "allnews.ch"},
    "Maroc": {"leseco.ma", "medias24.com", "lematin.ma", "lavieeco.com", "telquel.ma",
              "hespress.com", "mapexpress.ma", "challenge.ma", "aujourdhui.ma", "leconomiste.com",
              "boursenews.ma", "le360.ma", "snrtnews.com", "bladi.net", "maroc-hebdo.press.ma",
              "mapnews.ma", "h24info.ma", "ledesk.ma", "financenews.press.ma", "africabusinessplus.com",
              "assahifa.com", "machahid.info", "kech24.com", "febrayer.com", "detafour.com",
              "hibapress.com", "alyaoum24.com", "barlamane.com"},
    "Émirats (Dubaï)": {"thenationalnews.com", "gulfnews.com", "khaleejtimes.com",
                        "arabianbusiness.com", "zawya.com"},
    "Royaume-Uni": {"ft.com", "theguardian.com", "telegraph.co.uk", "bbc.com", "bbc.co.uk",
                    "estateagenttoday.co.uk", "propertyweek.com", "cityam.com"},
    "États-Unis": {"bloomberg.com", "wsj.com", "nytimes.com", "cnbc.com", "forbes.com",
                   "realtor.com", "housingwire.com", "bisnow.com", "finance.yahoo.com",
                   "nerdwallet.com", "morningstar.com", "jll.com", "commercialcafe.com",
                   "multifamilybiz.com", "rebusinessonline.com"},
    "Espagne": {"elpais.com", "expansion.com", "cincodias.elpais.com", "eleconomista.es",
                "idealista.com", "elmundo.es", "abc.es", "fotocasa.es"},
    "Canada": {"theglobeandmail.com", "financialpost.com", "cbc.ca", "lapresse.ca",
               "journaldemontreal.com", "bnnbloomberg.ca"},
}

# Noms de pays / adjectifs / grandes villes (dans le titre ou le resume)
GEO_TOKENS = {
    "France": ["france", "français", "francais", "française", "paris", "lyon", "marseille",
               "bordeaux", "toulouse", "nantes", "francilien", "ile-de-france", "île-de-france"],
    "Belgique": ["belgique", "belge", "bruxelles", "wallonie", "flandre", "anvers",
                 "liège", "liege", "gand", "charleroi", "namur"],
    "Suisse": ["suisse", "genève", "geneve", "zurich", "lausanne", "bâle", "bale",
               "berne", "vaud", "romand", "valais"],
    "Maroc": ["maroc", "marocain", "marocaine", "casablanca", "rabat", "marrakech",
              "tanger", "agadir", "fès", "fez", "kénitra", "kenitra", "dirham", "mmdh", "ddh",
              "المغرب", "مغرب", "مغربي", "مغربية", "الدار البيضاء", "الرباط", "مراكش",
              "طنجة", "أكادير", "فاس", "القنيطرة", "درهم", "العيون"],
    "Émirats (Dubaï)": ["uae", "emirates", "emirati", "émirats", "emirats", "dubai", "dubaï",
                        "abu dhabi", "sharjah", "ajman", "الإمارات", "دبي", "أبوظبي", "الشارقة"],
    "Royaume-Uni": ["uk", "u.k.", "britain", "british", "england", "english", "london",
                    "scotland", "wales", "manchester", "birmingham", "leeds", "glasgow", "edinburgh"],
    "États-Unis": ["u.s.", "usa", "america", "american", "new york", "california", "texas",
                   "florida", "chicago", "los angeles", "manhattan", "washington", "boston",
                   "miami", "seattle"],
    "Espagne": ["españa", "espana", "español", "espanol", "española", "madrid", "barcelona",
                "valencia", "sevilla", "málaga", "malaga", "bilbao", "spain", "spanish"],
    "Canada": ["canada", "canadien", "canadienne", "canadian", "toronto", "montréal",
               "montreal", "vancouver", "ottawa", "québec", "quebec", "calgary", "edmonton"],
}


def is_on_country(country, media_domain, text):
    """True si l'article concerne bien le pays (domaine national, media reconnu, ou nom cite)."""
    dom = (media_domain or "").lower()
    for tld in GEO_TLDS.get(country, []):
        if dom.endswith(tld):
            return True
    if dom in GEO_DOMAINS.get(country, set()):
        return True
    hay = (text or "").lower()
    return any(tok in hay for tok in GEO_TOKENS.get(country, []))


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
