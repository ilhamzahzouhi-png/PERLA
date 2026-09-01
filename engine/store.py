"""Persistance simple des articles dans un fichier JSON."""

import json
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "docs", "data")
ARTICLES_FILE = os.path.join(DATA_DIR, "articles.json")


def _ensure_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def load_articles():
    if not os.path.exists(ARTICLES_FILE):
        return []
    try:
        with open(ARTICLES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def save_articles(articles):
    _ensure_dir()
    with open(ARTICLES_FILE, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)


def merge_articles(existing, new_items):
    """Fusionne en evitant les doublons PAR pays : (pays, cle de dedup)."""
    seen = {(a.get("country"), a["dedup_key"]) for a in existing}
    merged = list(existing)
    added = 0
    for item in new_items:
        key = (item.get("country"), item["dedup_key"])
        if key not in seen:
            merged.append(item)
            seen.add(key)
            added += 1
    # tri par date de publication decroissante (chaines ISO triables)
    merged.sort(key=lambda a: a.get("published", ""), reverse=True)
    return merged, added
