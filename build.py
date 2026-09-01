"""Collecte planifiee : recupere les articles et genere les fichiers JSON du site statique.

Lance par GitHub Actions (voir .github/workflows/collect.yml). Ecrit dans docs/data/ :
- articles.json : tous les articles consolides
- filters.json  : pays / langues / thematiques pour les menus
- meta.json     : date de derniere mise a jour + total
"""

import json
import os
from datetime import datetime, timezone

from engine import fetcher, store
from engine import sources as sources_mod
from engine import themes as themes_mod


def main():
    print("Collecte en cours…")
    new_items, errors = fetcher.fetch_all(
        progress=lambda label, count, err: print(
            ("  ERREUR " + label + " : " + err) if err else ("  " + label + " : " + str(count))
        )
    )
    existing = store.load_articles()
    merged, added = store.merge_articles(existing, new_items)
    store.save_articles(merged)

    data_dir = store.DATA_DIR
    os.makedirs(data_dir, exist_ok=True)

    filters = {
        "countries": [c["name"] for c in sources_mod.COUNTRIES],
        "languages": [{"code": k, "label": v} for k, v in sources_mod.LANG_LABEL.items()],
        "themes": themes_mod.all_theme_names(),
    }
    with open(os.path.join(data_dir, "filters.json"), "w", encoding="utf-8") as f:
        json.dump(filters, f, ensure_ascii=False, indent=2)

    meta = {
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "total": len(merged),
        "added": added,
        "errors": errors,
    }
    with open(os.path.join(data_dir, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print("Termine : " + str(added) + " nouveaux, " + str(len(merged)) + " au total, "
          + str(len(errors)) + " source(s) en erreur.")


if __name__ == "__main__":
    main()
