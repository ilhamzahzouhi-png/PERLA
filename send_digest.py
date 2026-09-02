"""Envoie la revue quotidienne par e-mail via l'API Brevo (stdlib uniquement).

Configuration : digest_config.json (expediteur, destinataires, lien du site).
Cle d'API : lue depuis la variable d'environnement BREVO_API_KEY
            (stockee en tant que "Secret" GitHub — jamais dans le code).

Lance apres build.py (voir .github/workflows/collect.yml).
"""

import json
import os
import sys
import urllib.request
import urllib.error

from engine import store, digest

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "digest_config.json")
BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def load_config():
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def send_via_brevo(api_key, cfg, subject, html, text):
    payload = {
        "sender": {"email": cfg["sender_email"], "name": cfg.get("sender_name", "")},
        "to": [{"email": r} for r in cfg["recipients"]],
        "subject": subject,
        "htmlContent": html,
        "textContent": text,
    }
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        BREVO_URL, data=data, method="POST",
        headers={
            "api-key": api_key,
            "content-type": "application/json",
            "accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status, resp.read().decode("utf-8", "ignore")


def main():
    api_key = os.environ.get("BREVO_API_KEY", "").strip()
    if not api_key:
        print("BREVO_API_KEY absente — envoi ignore.")
        return 0

    cfg = load_config()
    articles = store.load_articles()
    subject, html, text, count = digest.build_digest(
        articles, site_url=cfg.get("site_url", ""), hours=cfg.get("hours", 24)
    )

    if count == 0:
        print("Aucun article recent — aucun e-mail envoye.")
        return 0

    try:
        status, body = send_via_brevo(api_key, cfg, subject, html, text)
        print("E-mail envoye (HTTP %s) a %d destinataire(s), %d article(s)."
              % (status, len(cfg["recipients"]), count))
        return 0
    except urllib.error.HTTPError as e:
        print("ERREUR Brevo HTTP %s : %s" % (e.code, e.read().decode("utf-8", "ignore")))
        return 1
    except Exception as e:  # noqa: BLE001
        print("ERREUR envoi : %s" % e)
        return 1


if __name__ == "__main__":
    sys.exit(main())
