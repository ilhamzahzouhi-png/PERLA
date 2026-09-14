"""Recuperation et parsing des flux Google News RSS."""

import urllib.request
import xml.etree.ElementTree as ET
import re
import hashlib
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse

from . import sources as sources_mod
from . import themes as themes_mod

USER_AGENT = "Mozilla/5.0 (VeilleImmobilier/1.0)"


def _fetch_url(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _clean_html(text):
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _normalize_title(title):
    t = (title or "").lower()
    # Google News suffixe souvent " - Nom du media"
    t = re.sub(r"\s+-\s+[^-]+$", "", t)
    t = re.sub(r"[^\w\s]", "", t, flags=re.UNICODE)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _parse_date(raw):
    if not raw:
        return ""
    try:
        dt = parsedate_to_datetime(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except (TypeError, ValueError):
        return ""


def _extract_source(item, ns):
    """Retourne (nom_media, domaine) depuis l'element <source url="...">."""
    src = item.find("source")
    if src is None:
        return "", ""
    name = (src.text or "").strip()
    url = (src.attrib.get("url") or "").strip()
    domain = ""
    if url:
        host = urlparse(url).netloc.lower()
        domain = host[4:] if host.startswith("www.") else host
    return name, domain


def fetch_source(source):
    """Recupere et parse un flux ; retourne une liste d'articles normalises."""
    data = _fetch_url(source["url"])
    root = ET.fromstring(data)
    items = root.findall(".//item")
    articles = []
    for item in items:
        title = _clean_html(_text(item, "title"))
        if not title:
            continue
        link = _text(item, "link")
        description = _clean_html(_text(item, "description"))
        published = _parse_date(_text(item, "pubDate"))
        media, media_domain = _extract_source(item, None)
        haystack = title + " " + description
        # Fiabilite geographique : on ecarte les articles qui ne concernent pas
        # vraiment le pays du flux (evite les articles France classes "Maroc", etc.)
        if not sources_mod.is_on_country(source["country"], media_domain, haystack):
            continue
        detected = themes_mod.classify(haystack)
        dedup_key = _normalize_title(title) or hashlib.md5(link.encode("utf-8")).hexdigest()
        articles.append({
            "title": title,
            "link": link,
            "description": description,
            "published": published,
            "media": media,
            "media_domain": media_domain,
            "country": source["country"],
            "language": source["language"],
            "language_label": source["language_label"],
            "themes": detected,
            "primary_theme": detected[0],
            "dedup_key": dedup_key,
            "collected_at": datetime.now(timezone.utc).isoformat(),
        })
    return articles


def _text(item, tag):
    el = item.find(tag)
    return el.text if el is not None and el.text else ""


def fetch_all(progress=None):
    """Recupere toutes les sources. Retourne (articles, erreurs)."""
    all_articles = []
    errors = []
    index = {}  # (pays, cle) -> position dans all_articles ; permet de compter les reprises
    for src in sources_mod.build_sources():
        label = src["country"] + " / " + src["language_label"]
        try:
            found = fetch_source(src)
            for a in found:
                key = (a["country"], a["dedup_key"])
                if key in index:
                    # meme sujet deja vu (autre media/edition) -> on compte la reprise
                    all_articles[index[key]]["mentions"] = all_articles[index[key]].get("mentions", 1) + 1
                else:
                    a["mentions"] = 1
                    index[key] = len(all_articles)
                    all_articles.append(a)
            if progress:
                progress(label, len(found), None)
        except Exception as e:  # noqa: BLE001 - on veut continuer malgre une source KO
            errors.append({"source": label, "error": str(e)})
            if progress:
                progress(label, 0, str(e))
    return all_articles, errors
