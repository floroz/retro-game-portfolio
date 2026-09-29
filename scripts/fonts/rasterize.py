#!/usr/bin/env python3
"""
Rasterizes the engine's world-text font (docs/art-spec.md, Phase H, "Text"):
a serif bitmap font on the 640x320 art grid, as in The Curse of Monkey
Island. The source is Libre Caslon Text (SIL OFL 1.1,
src/assets/fonts/LibreCaslonText-OFL.txt), in assets-src/fonts/.

For each size, the variable font is instanced at one weight and every glyph
is rendered by FreeType in monochrome (1-bit, hinted by FreeType's
autohinter, no anti-aliasing), trimmed to its ink, and written as a text
grid with its advance and bearings. Pair kerning comes from the font's GPOS
`kern` lookups, rounded to whole pixels. Hand-tuned glyphs in
scripts/fonts/overrides-<size>.txt replace the rasterized ones, so a
re-run keeps them. The outline and drop shadow are not baked in: the engine
adds them when it draws (src/engine/font.ts), in each label's colours.

Output: src/assets/fonts/serif-<size>.txt, parsed by src/engine/bitmapFont.ts.

Needs Python 3 with Pillow (built with FreeType) and fontTools:

    pip install pillow fonttools
    python3 scripts/fonts/rasterize.py [--preview <dir>]

--preview writes an 8x sheet of every glyph and some sample lines, with the
outline and shadow, for review.
"""

from __future__ import annotations

import argparse
import io
import math
import sys
from dataclasses import dataclass, field
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets-src/fonts/LibreCaslonText[wght].ttf"
OUT_DIR = ROOT / "src/assets/fonts"
OVERRIDES_DIR = ROOT / "scripts/fonts"

# Latin, Latin-1, Latin Extended-A, and the punctuation the copy uses.
EXTRA = "–—‘’‚“”„†•…‹›€™−×·"
CHARSET = (
    [chr(c) for c in range(0x20, 0x7F)]
    + [chr(c) for c in range(0xA0, 0x180)]
    + list(EXTRA)
)


@dataclass
class Size:
    id: str
    wght: int
    ppem: int
    # Pixels from one line's top to the next's.
    line: int
    # Extra pixels between letters, and extra per space, as in MI3's
    # widely set speech text.
    tracking: int
    word: int
    # Capitals only: signs, boards, and captions.
    upper: bool
    comment: str


SIZES = [
    Size(
        "regular",
        wght=600,
        ppem=16,
        line=19,
        tracking=1,
        word=2,
        upper=False,
        comment="Speech, the status line, and anything longer than a word.",
    ),
    Size(
        "small",
        wght=700,
        ppem=11,
        line=12,
        tracking=1,
        word=1,
        upper=True,
        comment="Capitals, for signs, boards, captions, and the map.",
    ),
    Size(
        "tiny",
        wght=700,
        ppem=9,
        line=10,
        tracking=1,
        word=1,
        upper=True,
        comment="Capitals, for a sign too small for the small size (maxWidth).",
    ),
]


@dataclass
class Glyph:
    char: str
    advance: int
    # Pixels from the pen position to the first column of ink.
    left: int
    # Rows of ink above the baseline (the first row's height over it).
    top: int
    rows: list[str] = field(default_factory=list)


def instance(wght: int) -> tuple[TTFont, bytes]:
    font = TTFont(SOURCE)
    static = instancer.instantiateVariableFont(font, {"wght": wght})
    buf = io.BytesIO()
    static.save(buf)
    return static, buf.getvalue()


def rasterize(font: ImageFont.FreeTypeFont, ch: str, ppem: int) -> Glyph:
    """
    One glyph, 1-bit. It's drawn after a reference "H" in the same line, so
    every glyph shares the line's baseline: Pillow rounds a lone glyph's
    vertical offset from its own bounding box, which let letters drift a
    pixel up or down against each other.
    """
    prefix = "H   "
    img = Image.new("1", (ppem * 10, ppem * 4), 0)
    draw = ImageDraw.Draw(img)
    draw.fontmode = "1"
    ox, oy = ppem, ppem * 3
    draw.text((ox, oy), prefix + ch, font=font, fill=1, anchor="ls")
    pen = ox + round(font.getlength(prefix))
    ref = img.crop((0, 0, ox + round(font.getlength("H")), img.height)).getbbox()
    baseline = ref[3] if ref else oy
    advance = round(font.getlength(ch))
    box = img.crop((pen - ppem // 3, 0, img.width, img.height)).getbbox()
    if not box or ch.isspace():
        return Glyph(ch, advance, 0, 0, [])
    x0, y0, x1, y1 = box
    x0 += pen - ppem // 3
    x1 += pen - ppem // 3
    rows = [
        "".join("#" if img.getpixel((x, y)) else "." for x in range(x0, x1))
        for y in range(y0, y1)
    ]
    # Spaced by ink, as a bitmap font is: the letter starts at the pen and
    # leaves a 1 px gap, so every pair of letters sits the same distance
    # apart (plus tracking and kerning). The outline's hinted side bearings
    # left diagonal letters (v, w, y) looking loose at this size.
    return Glyph(ch, x1 - x0 + 1, 0, baseline - y0, rows)


def kerning(static: TTFont, chars: list[str], ppem: int) -> dict[tuple[str, str], int]:
    """Pair kerning from GPOS `kern` (PairPos, formats 1 and 2), in pixels."""
    if "GPOS" not in static:
        return {}
    upm = static["head"].unitsPerEm
    cmap = static.getBestCmap()
    names = {c: cmap[ord(c)] for c in chars if ord(c) in cmap}
    gpos = static["GPOS"].table
    lookups: list[int] = []
    for rec in gpos.FeatureList.FeatureRecord:
        if rec.FeatureTag == "kern":
            lookups += rec.Feature.LookupListIndex
    subtables = []
    for i in sorted(set(lookups)):
        lookup = gpos.LookupList.Lookup[i]
        for st in lookup.SubTable:
            if lookup.LookupType == 9:
                st = st.ExtSubTable
            if getattr(st, "LookupType", 2) == 2 or lookup.LookupType == 2:
                subtables.append(st)

    def value(a: str, b: str) -> int | None:
        for st in subtables:
            cov = st.Coverage.glyphs
            if a not in cov:
                continue
            if st.Format == 1:
                idx = cov.index(a)
                for rec in st.PairSet[idx].PairValueRecord:
                    if rec.SecondGlyph == b:
                        v = rec.Value1
                        return getattr(v, "XAdvance", 0) or 0 if v else 0
                continue
            c1 = st.ClassDef1.classDefs.get(a, 0)
            c2 = st.ClassDef2.classDefs.get(b, 0)
            rec = st.Class1Record[c1].Class2Record[c2]
            v = rec.Value1
            x = (getattr(v, "XAdvance", 0) or 0) if v else 0
            if x:
                return x
        return None

    out: dict[tuple[str, str], int] = {}
    for a, ga in names.items():
        for b, gb in names.items():
            v = value(ga, gb)
            if not v:
                continue
            px = math.floor(v * ppem / upm + 0.5)
            if px:
                out[(a, b)] = px
    return out


def parse_glyphs(text: str) -> dict[str, Glyph]:
    """Glyph blocks in the atlas format (used for the override files)."""
    out: dict[str, Glyph] = {}
    current: Glyph | None = None
    for raw in text.splitlines():
        line = raw.rstrip()
        if line.startswith("//"):
            continue
        if line.startswith("glyph "):
            parts = line.split()
            ch = chr(int(parts[1], 16))
            current = Glyph(ch, int(parts[2]), int(parts[3]), int(parts[4]), [])
            out[ch] = current
        elif current is not None and line and set(line) <= {"#", "."}:
            current.rows.append(line)
        elif not line:
            current = None
    return out


def glyph_block(g: Glyph) -> str:
    shown = g.char if g.char.isprintable() and not g.char.isspace() else ""
    head = f"glyph {ord(g.char):04X} {g.advance} {g.left} {g.top} {shown}".rstrip()
    return "\n".join([head, *g.rows])


def build(size: Size) -> tuple[list[Glyph], dict[tuple[str, str], int], dict[str, int]]:
    static, data = instance(size.wght)
    font = ImageFont.truetype(io.BytesIO(data), size.ppem)
    cmap = static.getBestCmap()
    chars = [c for c in CHARSET if ord(c) in cmap]
    if size.upper:
        chars = [c for c in chars if c.upper() == c]
    glyphs = [rasterize(font, c, size.ppem) for c in chars]
    override_file = OVERRIDES_DIR / f"overrides-{size.id}.txt"
    if override_file.exists():
        tuned = parse_glyphs(override_file.read_text(encoding="utf8"))
        glyphs = [tuned.get(g.char, g) for g in glyphs]
    by_char = {g.char: g for g in glyphs}
    ascent = max(g.top for g in glyphs)
    descent = max(len(g.rows) - g.top for g in glyphs if g.rows)
    metrics = {
        "cap": by_char["H"].top,
        "x": by_char["x"].top if "x" in by_char else by_char["X"].top,
        "ascent": ascent,
        "descent": descent,
    }
    return glyphs, kerning(static, chars, size.ppem), metrics


def write(size: Size) -> Path:
    glyphs, kerns, m = build(size)
    header = [
        f"// {size.comment}",
        "// Generated by scripts/fonts/rasterize.py from Libre Caslon Text",
        "// (SIL OFL 1.1, src/assets/fonts/LibreCaslonText-OFL.txt); hand-tuned",
        f"// glyphs come from scripts/fonts/overrides-{size.id}.txt. Don't edit",
        "// this file: edit the overrides and re-run the script.",
        "//",
        "// glyph <code point> <advance> <left bearing> <rows above baseline>",
        "// kern <first> <second> <px>",
        f"font {size.id}",
        f"source LibreCaslonText wght {size.wght} ppem {size.ppem}",
        f"cap {m['cap']}",
        f"xheight {m['x']}",
        f"ascent {m['ascent']}",
        f"descent {m['descent']}",
        f"line {size.line}",
        f"tracking {size.tracking}",
        f"word {size.word}",
        f"upper {1 if size.upper else 0}",
        "",
    ]
    body = "\n\n".join(glyph_block(g) for g in glyphs)
    kern_lines = [
        f"kern {ord(a):04X} {ord(b):04X} {v}"
        for (a, b), v in sorted(kerns.items(), key=lambda kv: (ord(kv[0][0]), ord(kv[0][1])))
    ]
    path = OUT_DIR / f"serif-{size.id}.txt"
    path.write_text("\n".join(header) + body + "\n\n" + "\n".join(kern_lines) + "\n", encoding="utf8")
    print(f"{path.relative_to(ROOT)}: {len(glyphs)} glyphs, {len(kerns)} kerning pairs, cap {m['cap']} px")
    return path


# --- Preview -------------------------------------------------------------------

SAMPLES = [
    "It says, 'Ask Me About Grim Fandango.'",
    "Hello, sailor! I'm Daniele. Pick a gate and I'll walk you there.",
    "The quick brown fox jumps over the lazy dog. 0123456789",
    "Zürich, Sorrento, London — “Résumé”… ¿Qué? £4.50 & 100% €",
]


def draw_line(canvas: Image.Image, glyphs: dict[str, Glyph], kerns, size: Size, text: str, x: int, y: int, cap: int, color, outline, shadow):
    ink = Image.new("1", canvas.size, 0)
    px = ink.load()
    pen = x
    if size.upper:
        text = text.upper()
    prev = None
    for ch in text:
        g = glyphs.get(ch) or glyphs["?"]
        if prev is not None:
            pen += size.tracking + kerns.get((prev, ch), 0)
        for ry, row in enumerate(g.rows):
            for rx, c in enumerate(row):
                if c == "#":
                    px[pen + g.left + rx, y + cap - g.top + ry] = 1
        pen += g.advance + (size.word if ch == " " else 0)
        prev = ch
    w, h = canvas.size
    dil = Image.new("1", canvas.size, 0)
    dp = dil.load()
    for yy in range(1, h - 2):
        for xx in range(1, w - 2):
            if px[xx, yy] or px[xx - 1, yy] or px[xx + 1, yy] or px[xx, yy - 1] or px[xx, yy + 1]:
                dp[xx, yy] = 1
    if shadow:
        sh = Image.new("1", canvas.size, 0)
        sh.paste(dil, (1, 1))
        canvas.paste(shadow, mask=sh)
    canvas.paste(outline, mask=dil)
    canvas.paste(color, mask=ink)


def preview(out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        glyphs, kerns, m = build(size)
        by = {g.char: g for g in glyphs}
        cols = 24
        cell_w = max(g.advance for g in glyphs) + 6
        cell_h = size.line + 6
        rows = math.ceil(len(glyphs) / cols)
        sheet_h = rows * cell_h + len(SAMPLES) * (size.line + 4) + 10
        sheet_w = max(cols * cell_w, 640)
        img = Image.new("RGB", (sheet_w, sheet_h), (122, 84, 58))
        for i, g in enumerate(glyphs):
            cx = (i % cols) * cell_w + 3
            cy = (i // cols) * cell_h + 3
            draw_line(img, by, kerns, size, g.char, cx, cy, m["cap"], (255, 255, 255), (0, 0, 0), None)
        y = rows * cell_h + 6
        for s in SAMPLES:
            draw_line(img, by, kerns, size, s, 4, y, m["cap"], (255, 255, 255), (0, 0, 0), (0, 0, 0))
            y += size.line + 4
        big = img.resize((img.width * 8, img.height * 8), Image.NEAREST)
        path = out_dir / f"serif-{size.id}@8x.png"
        big.save(path)
        print(f"preview: {path}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--preview", type=Path, help="write 8x review sheets to this directory")
    args = ap.parse_args()
    for size in SIZES:
        write(size)
    if args.preview:
        preview(args.preview)
    return 0


if __name__ == "__main__":
    sys.exit(main())
