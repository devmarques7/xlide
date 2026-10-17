"""Convert an XLIDE deck written with editorial layouts into the Investor Pitch template.

Usage: python3 scripts/convert-to-pitch.py decks/source/<deck>.json decks/<deck>.json [#accent]
Rules: statement -> pitch-statement (label as title, sentence as lead, verse as side text),
cover -> pitch-cover, services -> pitch-numbers. Tones follow the slide's role.
Texts are kept word for word; only *highlight* markers are added to the last line of
two-line statements.
"""
import json, re, sys

src, out = sys.argv[1], sys.argv[2]
accent = sys.argv[3] if len(sys.argv) > 3 else "#1F4BD8"
deck = json.load(open(src, encoding="utf-8"))
LANGS = deck.get("languages", ["pt", "en", "nl"])


def each(v, fn):
    if v is None:
        return None
    if isinstance(v, str):
        return fn(v)
    return {k: fn(x) for k, x in v.items()}


def text(v, lang="pt"):
    if v is None:
        return ""
    return v if isinstance(v, str) else v.get(lang) or next(iter(v.values()), "")


def blank(v):
    return not text(v).strip()


def highlight_last_line(s):
    lines = s.split("\n")
    if len(lines) < 2 or "*" in s:
        return s
    lines[-1] = f"*{lines[-1].strip()}*"
    return "\n".join(lines)


def image(path):
    if not path:
        return None
    return path if path.startswith(("http", "/")) else "/" + path


def kind(slide):
    eb = text(slide.get("eyebrow"), "pt").lower()
    sub = text(slide.get("subtitle"), "pt").lower()
    if sub in ("bíblia", "citação"):
        return "verse"
    if eb.startswith("pergunta"):
        return "question"
    if eb.startswith("insight"):
        return "insight"
    if eb.startswith("para levar") or eb.startswith("a frase central"):
        return "takeaway"
    return "solo" if not eb else "label"


slides = []
for s in deck["slides"]:
    lay = s.get("layout")
    o = {"notes": s.get("notes")}
    if lay == "statement":
        k = kind(s)
        o["layout"] = "pitch-statement"
        if k == "verse":
            o.update(tone="light", title=s.get("eyebrow"), subtitle=s.get("title"), body=s.get("body"), cta=s.get("subtitle"))
        elif k == "question":
            o.update(tone="accent", title=s.get("eyebrow"), subtitle=each(s.get("title"), highlight_last_line))
        elif k == "insight":
            o.update(tone="light", title=s.get("eyebrow"), subtitle=each(s.get("title"), highlight_last_line))
        elif k == "takeaway":
            o.update(tone="dark", title=s.get("eyebrow"), subtitle=each(s.get("title"), highlight_last_line))
        elif k == "solo":
            o.update(tone="dark", subtitle=None if blank(s.get("title")) else s.get("title"))
        else:
            o.update(tone="light", title=s.get("eyebrow"), subtitle=s.get("title"), body=s.get("body"))
    elif lay == "cover":
        eb = s.get("eyebrow")
        section = isinstance(eb, str) and re.fullmatch(r"\d{2}", eb or "")
        o.update(layout="pitch-cover", title=s.get("title"), image=image(s.get("image")))
        if section:
            o.update(tone="accent", body=s.get("subtitle"), eyebrow=eb)
        else:
            o.update(tone="dark", eyebrow=eb, body=s.get("body") or s.get("subtitle"))
            if s.get("body") and s.get("subtitle"):
                o["subtitle"] = s.get("subtitle")
    elif lay == "services":
        items = []
        for i, it in enumerate(s.get("items", [])):
            label, body = it.get("label"), it.get("text")
            merged = {l: f"*{text(label, l)}*\n{text(body, l)}" for l in LANGS}
            items.append({"value": str(it.get("value") or i + 1).zfill(2), "text": merged})
        o.update(layout="pitch-numbers", tone="light", title=s.get("eyebrow"), items=items)
    else:
        o.update(s)
    slides.append({k: v for k, v in o.items() if v not in (None, "", [])})

result = {
    "title": deck["title"],
    "description": deck.get("description"),
    "author": deck.get("author"),
    "tags": deck.get("tags"),
    "languages": LANGS,
    "defaultLanguage": deck.get("defaultLanguage", LANGS[0]),
    "template": "pitch",
    "accent": accent,
    "slides": slides,
}
json.dump(result, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"{len(slides)} slides -> {out}")
