"""Build the small homepage font from the official Pretendard variable font.

Usage: python scripts/subset-home-font.py tmp/PretendardVariable.woff2
Build-time dependencies: fonttools and brotli (not website dependencies).
"""
from pathlib import Path
from html.parser import HTMLParser
import sys

from fontTools import subset
from fontTools.ttLib import TTFont


class PageText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


root = Path(__file__).resolve().parents[1]
parser = PageText()
parser.feed((root / "index.html").read_text(encoding="utf-8"))
text = "".join(parser.parts) + (root / "assets/home.js").read_text(encoding="utf-8")
unicodes = set(map(ord, text)) | set(range(0x20, 0x100))
unicodes |= set(range(0x2000, 0x2070)) | set(range(0x2190, 0x219A))

font = TTFont(sys.argv[1])
options = subset.Options()
options.flavor = "woff2"
options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14, 16, 17, 25]
options.name_languages = [0x409]
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=unicodes)
subsetter.subset(font)

# The original license reserves the name Pretendard for the unmodified font.
# Keep the copyright and license records; rename this reduced glyph collection.
for record in font["name"].names:
    if record.nameID not in (0, 13):
        value = record.toUnicode().replace("Pretendard", "WorkroomSans")
        record.string = value.encode(record.getEncoding())
for name_id, value in ((1, "Workroom Sans"), (3, "WorkroomSans-Homepage"),
                       (4, "Workroom Sans"), (6, "WorkroomSans-Regular"),
                       (16, "Workroom Sans"), (25, "WorkroomSans")):
    font["name"].setName(value, name_id, 3, 1, 0x409)
font.flavor = "woff2"
destination = root / "assets/fonts/WorkroomSans.woff2"
font.save(destination)
missing = unicodes - set(font.getBestCmap())
missing_visible = {c for c in missing if chr(c).isalnum() and c in set(map(ord, text))}
if missing_visible:
    raise ValueError(f"Missing visible characters: {sorted(missing_visible)}")
print(f"Homepage font: {destination.stat().st_size:,} bytes")
