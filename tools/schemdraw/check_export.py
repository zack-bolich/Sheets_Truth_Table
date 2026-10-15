"""Checks that Schemdraw parses every exported expression as the same function.

Usage: python check_export.py cases.json   (cases from make_cases.mjs)
"""

from __future__ import annotations

import json
import sys

from schemdraw.parsing.logic_parser import parse_string, to_tree

GATES = {
    "and": all,
    "or": any,
    "xor": lambda xs: sum(xs) % 2 == 1,
}
INVERTED = {"nand": "and", "nor": "or", "xnor": "xor"}


def evaluate(tree, env: dict[str, bool]) -> bool:
    node = tree.node
    if node in ("true", "false"):
        return node == "true"
    if not tree.children:
        return env[node]
    inputs = [evaluate(child, env) for child in tree.children]
    if node == "not":
        return not inputs[0]
    if node == "buf":
        return inputs[0]
    if node in INVERTED:
        return not GATES[INVERTED[node]](inputs)
    return GATES[node](inputs)


def main(path: str) -> int:
    cases = json.load(open(path, encoding="utf-8"))
    failures = 0
    for case in cases:
        tree = to_tree(parse_string(case["schemdraw"]))
        names = case["variables"]
        n = len(names)
        got = [
            i
            for i in range(2**n)
            if evaluate(tree, {v: bool((i >> (n - 1 - k)) & 1) for k, v in enumerate(names)})
        ]
        if got != case["minterms"]:
            failures += 1
            print(f"MISMATCH {case['expression']} -> {case['schemdraw']}: {got} != {case['minterms']}")
    print(f"{len(cases)} cases, {failures} mismatches")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
