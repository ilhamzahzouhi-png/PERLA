"""Serveur local : sert le tableau de bord + API JSON de la veille immobiliere."""

import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

from engine import fetcher, store
from engine import sources as sources_mod
from engine import themes as themes_mod

PORT = int(os.environ.get("PORT", "8000"))
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "docs")

# Etat d'un rafraichissement en cours (partage entre requetes)
_refresh_lock = threading.Lock()
_refresh_state = {"running": False, "log": [], "added": 0, "total": 0, "done": False}


def _run_refresh():
    global _refresh_state
    with _refresh_lock:
        if _refresh_state["running"]:
            return
        _refresh_state = {"running": True, "log": [], "added": 0, "total": 0, "done": False}

    def progress(label, count, err):
        msg = ("ERREUR " + label + " : " + err) if err else (label + " : " + str(count) + " articles")
        _refresh_state["log"].append(msg)

    new_items, errors = fetcher.fetch_all(progress=progress)
    existing = store.load_articles()
    merged, added = store.merge_articles(existing, new_items)
    store.save_articles(merged)
    _refresh_state["added"] = added
    _refresh_state["total"] = len(merged)
    _refresh_state["errors"] = errors
    _refresh_state["running"] = False
    _refresh_state["done"] = True


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # silence

    def _send_json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path):
        if not os.path.isfile(path):
            self.send_error(404, "Not found")
            return
        ext = os.path.splitext(path)[1].lower()
        ctype = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".svg": "image/svg+xml",
        }.get(ext, "application/octet-stream")
        with open(path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        route = parsed.path
        if route == "/api/articles":
            self._api_articles(parse_qs(parsed.query))
        elif route == "/api/stats":
            self._api_stats()
        elif route == "/api/highlights":
            self._api_highlights()
        elif route == "/api/filters":
            self._api_filters()
        elif route == "/api/refresh/status":
            self._send_json(_refresh_state)
        elif route == "/" or route == "":
            self._send_file(os.path.join(PUBLIC_DIR, "index.html"))
        else:
            # fichiers statiques (empeche la remontee de repertoire)
            safe = os.path.normpath(route).lstrip("/")
            self._send_file(os.path.join(PUBLIC_DIR, safe))

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/refresh":
            if _refresh_state["running"]:
                self._send_json({"status": "already_running"})
                return
            threading.Thread(target=_run_refresh, daemon=True).start()
            self._send_json({"status": "started"})
        else:
            self.send_error(404, "Not found")

    def _api_articles(self, q):
        articles = store.load_articles()
        countries = q.get("country") or []  # peut contenir plusieurs pays
        language = _first(q, "language")
        theme = _first(q, "theme")
        search = (_first(q, "q") or "").lower()
        date_from = _first(q, "from")  # AAAA-MM-JJ inclus
        date_to = _first(q, "to")      # AAAA-MM-JJ inclus
        result = []
        for a in articles:
            if countries and a.get("country") not in countries:
                continue
            if language and a.get("language") != language:
                continue
            if theme and theme not in a.get("themes", []):
                continue
            if search and search not in (a.get("title", "") + " " + a.get("description", "")).lower():
                continue
            if date_from or date_to:
                day = (a.get("published") or "")[:10]
                if not day:
                    continue
                if date_from and day < date_from:
                    continue
                if date_to and day > date_to:
                    continue
            result.append(a)
        self._send_json({"count": len(result), "articles": result[:500]})

    def _api_stats(self):
        articles = store.load_articles()
        by_country, by_language, by_theme = {}, {}, {}
        for a in articles:
            by_country[a.get("country")] = by_country.get(a.get("country"), 0) + 1
            lbl = a.get("language_label", a.get("language"))
            by_language[lbl] = by_language.get(lbl, 0) + 1
            for t in a.get("themes", []):
                by_theme[t] = by_theme.get(t, 0) + 1
        self._send_json({
            "total": len(articles),
            "by_country": by_country,
            "by_language": by_language,
            "by_theme": by_theme,
        })

    def _api_highlights(self):
        """Meilleurs articles pour la page d'accueil : classes, recents, diversifies par pays."""
        articles = store.load_articles()
        classified = [a for a in articles if a.get("primary_theme") != themes_mod.UNCLASSIFIED]
        classified.sort(key=lambda a: a.get("published", ""), reverse=True)
        limit = 6
        picked, used_countries = [], set()
        # 1er passage : un article par pays (les plus recents) pour la diversite
        for a in classified:
            if a["country"] not in used_countries:
                picked.append(a)
                used_countries.add(a["country"])
            if len(picked) >= limit:
                break
        # 2e passage : completer avec les plus recents restants
        if len(picked) < limit:
            keys = {id(a) for a in picked}
            for a in classified:
                if id(a) not in keys:
                    picked.append(a)
                if len(picked) >= limit:
                    break
        self._send_json({"count": len(picked), "articles": picked})

    def _api_filters(self):
        countries = [c["name"] for c in sources_mod.COUNTRIES]
        languages = [{"code": k, "label": v} for k, v in sources_mod.LANG_LABEL.items()]
        self._send_json({
            "countries": countries,
            "languages": languages,
            "themes": themes_mod.all_theme_names(),
        })


def _first(q, key):
    v = q.get(key)
    return v[0] if v else None


def main():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("Veille immobilier — tableau de bord sur http://localhost:" + str(PORT))
    print("Ctrl+C pour arreter.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArret.")
        server.shutdown()


if __name__ == "__main__":
    main()
