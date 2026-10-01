#!/usr/bin/env python3
"""Build the smooth mobile heading font from the bundled Libre Caslon source.

Requires fontTools. Run: python3 scripts/fonts/pocket.py
License: src/assets/fonts/LibreCaslonText-OFL.txt (SIL OFL 1.1).
"""
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[2]
font = TTFont(ROOT / "assets-src/fonts/LibreCaslonText[wght].ttf", recalcTimestamp=False)
instantiateVariableFont(font, {"wght": 400}, inplace=True)
font.flavor = "woff"
font.save(ROOT / "src/assets/fonts/libre-caslon-text-regular.woff")
