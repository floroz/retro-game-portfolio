#!/usr/bin/env python3
"""Build local HTML fonts from the existing adventure serif pixel atlases.

Requires fontTools. Run: python3 scripts/fonts/inspection.py
The Caslon-derived source atlases retain their SIL OFL license alongside
these renamed derivatives. Pixel outlines keep the illustrated game's
letter shapes while browser text stays selectable, searchable and accessible.
"""
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import newTable
from fontTools.ttLib.tables._k_e_r_n import KernTable_format_0

ROOT = Path(__file__).resolve().parents[2]
FONTS = ROOT / 'src/assets/fonts'
UNIT = 32


def build(source, name, em):
    metrics, glyphs, pairs = {}, {}, []
    current = None
    for line in (FONTS / source).read_text().splitlines():
        if not line or line.startswith('//'):
            continue
        fields = line.split()
        if fields[0] == 'glyph':
            code, advance, left, top = fields[1:5]
            current = int(code, 16)
            glyphs[current] = [int(advance), int(left), int(top), []]
        elif current is not None and set(line) <= set('#+.'):
            glyphs[current][3].append(line)
        elif fields[0] == 'kern':
            pairs.append((int(fields[1], 16), int(fields[2], 16), int(fields[3])))
        elif fields[0] in ('ascent', 'descent', 'tracking', 'word', 'cap', 'xheight'):
            metrics[fields[0]] = int(fields[1])

    names = {code: f'uni{code:04X}' for code in glyphs}
    fb = FontBuilder(em * UNIT, isTTF=True)
    fb.setupGlyphOrder(['.notdef', *names.values()])
    fb.setupCharacterMap(names)
    outlines = {'.notdef': TTGlyphPen(None).glyph()}
    widths = {'.notdef': (em * UNIT, 0)}
    for code, (advance, left, top, rows) in glyphs.items():
        pen = TTGlyphPen(None)
        # One contour per horizontal ink run. Ignore the optional edge-tone
        # cells: they were a canvas antialiasing aid, not the letter skeleton.
        for row, pixels in enumerate(rows):
            col = 0
            while col < len(pixels):
                if pixels[col] != '#':
                    col += 1
                    continue
                start = col
                while col < len(pixels) and pixels[col] == '#':
                    col += 1
                x0, x1 = (left + start) * UNIT, (left + col) * UNIT
                y0, y1 = (top - row - 1) * UNIT, (top - row) * UNIT
                pen.moveTo((x0, y0))
                pen.lineTo((x0, y1))
                pen.lineTo((x1, y1))
                pen.lineTo((x1, y0))
                pen.closePath()
        outlines[names[code]] = pen.glyph()
        spacing = metrics['tracking'] + (metrics['word'] if code == 32 else 0)
        widths[names[code]] = ((advance + spacing) * UNIT, left * UNIT)
    fb.setupGlyf(outlines)
    fb.setupHorizontalMetrics(widths)
    fb.setupHorizontalHeader(ascent=metrics['ascent'] * UNIT, descent=-metrics['descent'] * UNIT)
    fb.setupNameTable({
        'familyName': name, 'styleName': 'Regular',
        'uniqueFontIdentifier': f'{name}-1.0', 'fullName': name,
        'psName': name.replace(' ', ''), 'version': 'Version 1.0',
        'copyright': 'Derived from Libre Caslon Text; SIL Open Font License 1.1.',
        'licenseDescription': 'SIL Open Font License, Version 1.1. See LibreCaslonText-OFL.txt.',
    })
    fb.setupOS2(sTypoAscender=metrics['ascent'] * UNIT,
                sTypoDescender=-metrics['descent'] * UNIT, sTypoLineGap=0,
                usWinAscent=metrics['ascent'] * UNIT, usWinDescent=metrics['descent'] * UNIT,
                sxHeight=metrics['xheight'] * UNIT, sCapHeight=metrics['cap'] * UNIT)
    fb.setupPost()
    if pairs:
        kern = newTable('kern')
        kern.version = 0
        subtable = KernTable_format_0()
        subtable.version, subtable.coverage = 0, 1
        subtable.kernTable = {(names[a], names[b]): value * UNIT for a, b, value in pairs if a in names and b in names}
        kern.kernTables = [subtable]
        fb.font['kern'] = kern
    # Fixed timestamps make regeneration reproducible.
    fb.font['head'].created = fb.font['head'].modified = 3873628800
    fb.font.recalcTimestamp = False
    fb.font.flavor = 'woff'
    fb.save(FONTS / (name.lower().replace(' ', '-') + '.woff'))


build('serif-regular.txt', 'Adventure Reading', 18)
build('serif-logo.txt', 'Adventure Display', 36)
