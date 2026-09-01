"""Classification des articles par thematique via mots-cles multilingues."""

# Chaque thematique -> liste de mots-cles (fr / en / es / ar melanges)
THEMES = {
    "Marché résidentiel": [
        "logement", "résidentiel", "prix immobilier", "maison", "appartement",
        "housing", "residential", "home price", "house price", "apartment",
        "vivienda", "residencial", "precio de la vivienda",
        "سكن", "سكني", "منازل", "شقق", "أسعار العقارات",
    ],
    "Immobilier commercial / bureaux / retail": [
        "bureaux", "commercial", "commerce", "entrepôt", "logistique", "retail",
        "office", "warehouse", "logistics",
        "oficinas", "comercial", "locales", "logística",
        "مكاتب", "تجاري", "تجزئة", "مستودع",
    ],
    "Immobilier de luxe / haut de gamme": [
        "luxe", "prestige", "haut de gamme",
        "luxury", "prime property", "high-end",
        "lujo", "prestigio", "alta gama",
        "فاخر", "رفاهية", "فخم",
    ],
    "Construction & promotion": [
        "construction", "chantier", "promoteur", "promotion immobilière", "programme neuf",
        "developer", "development", "homebuilder", "building site",
        "construcción", "promotor", "obra nueva",
        "بناء", "تشييد", "مطور عقاري", "ورش",
    ],
    "Financement & crédit": [
        "crédit immobilier", "prêt", "taux", "financement", "hypothèque",
        "mortgage", "loan", "interest rate", "financing",
        "hipoteca", "préstamo", "financiación", "tipos de interés",
        "قرض", "تمويل", "رهن عقاري", "فائدة",
    ],
    "Réglementation & fiscalité": [
        "loi", "réglementation", "fiscalité", "taxe", "impôt", "encadrement des loyers",
        "regulation", "tax", "housing law", "policy",
        "ley", "regulación", "impuesto", "fiscal",
        "قانون", "تنظيم", "ضريبة", "تشريع",
    ],
    "Investissement": [
        "investissement", "scpi", "rendement locatif", "fonds immobilier",
        "investment", "reit", "yield", "real estate fund",
        "inversión", "rentabilidad", "socimi", "fondo inmobiliario",
        "استثمار", "عائد", "صندوق عقاري",
    ],
    "PropTech & innovation": [
        "proptech", "startup", "numérique", "plateforme", "intelligence artificielle",
        "digital", "platform", "artificial intelligence", "tech",
        "tecnología", "plataforma", "digitalización",
        "تكنولوجيا", "رقمي", "منصة", "ذكاء اصطناعي",
    ],
    "Immobilier durable / ESG": [
        "durable", "énergétique", "rénovation", "écologique", "vert", "esg", "carbone",
        "sustainable", "energy", "green building", "retrofit", "carbon", "net zero",
        "sostenible", "energético", "verde", "rehabilitación",
        "مستدام", "طاقة", "أخضر", "بيئي",
    ],
    "Foncier & urbanisme": [
        "foncier", "urbanisme", "terrain", "aménagement", "zonage",
        "land", "urban planning", "zoning", "plot",
        "suelo", "urbanismo", "terreno", "urbanización",
        "أرض", "عقاري", "تخطيط عمراني", "تعمير",
    ],
    "Location & gestion locative": [
        "location", "loyer", "locataire", "bail", "gestion locative",
        "rent", "rental", "tenant", "lease", "letting",
        "alquiler", "arrendamiento", "inquilino",
        "إيجار", "كراء", "مستأجر",
    ],
    "Tourisme & résidences": [
        "tourisme", "hôtel", "résidence secondaire", "airbnb", "saisonnière",
        "tourism", "hotel", "resort", "short-term rental", "vacation rental",
        "turismo", "hotel", "vacacional", "alquiler turístico",
        "سياحة", "فندق", "منتجع", "عطلة",
    ],
}

UNCLASSIFIED = "Non classé"


def classify(text):
    """Retourne la liste des thematiques detectees dans le texte (peut etre vide)."""
    low = (text or "").lower()
    found = []
    for theme, keywords in THEMES.items():
        for kw in keywords:
            if kw.lower() in low:
                found.append(theme)
                break
    return found or [UNCLASSIFIED]


def all_theme_names():
    return list(THEMES.keys()) + [UNCLASSIFIED]
