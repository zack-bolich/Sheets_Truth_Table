"""Draw logic-gate diagrams from =SCHEMDRAW(...) output, for lab reports.

Each input is a line like ``GW = not E and not S and W`` (what
``=SCHEMDRAW(expression, "GW")`` returns) or a bare expression. Writes one
diagram per input, named after its label.

Examples:
    python draw.py "GW = not E and not S and W" "GS = not E and S"
    python draw.py -f lights.txt -o diagrams --format png

Copy a column of =SCHEMDRAW cells from Sheets into a text file to draw them
all at once. SVG needs only schemdraw; PNG also needs matplotlib.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import schemdraw
from schemdraw.parsing import logicparse

LABELLED = re.compile(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*$")


def parse_line(line: str, index: int) -> tuple[str, str]:
    """Split ``NAME = expr`` into (name, expr); bare expressions become F1, F2, ..."""
    match = LABELLED.match(line)
    if match:
        return match.group(1), match.group(2)
    return f"F{index}", line.strip()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("expressions", nargs="*", help='e.g. "GW = not E and not S and W"')
    parser.add_argument("-f", "--file", type=Path, help="text file with one expression per line")
    parser.add_argument("-o", "--outdir", type=Path, default=Path("."), help="output folder")
    parser.add_argument("--format", choices=["svg", "png"], default="svg")
    args = parser.parse_args(argv)

    lines = list(args.expressions)
    if args.file:
        lines += args.file.read_text(encoding="utf-8").splitlines()
    lines = [line for line in lines if line.strip()]
    if not lines:
        parser.error("give at least one expression or --file")

    schemdraw.use("svg" if args.format == "svg" else "matplotlib")
    args.outdir.mkdir(parents=True, exist_ok=True)
    for index, line in enumerate(lines, start=1):
        name, expression = parse_line(line, index)
        path = args.outdir / f"{name}.{args.format}"
        logicparse(expression, outlabel=name).save(str(path))
        print(f"{path}  ←  {expression}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
