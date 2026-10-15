# sheets-logic

[![CI](https://github.com/zack-bolich/Sheets_Truth_Table/actions/workflows/ci.yml/badge.svg)](https://github.com/zack-bolich/Sheets_Truth_Table/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Digital-logic custom functions for Google Sheets.** Type `=TRUTHTABLE("A & B | !C")` and the whole truth table spills into the sheet.

<!-- TODO: GIF of typing =TRUTHTABLE(...) and the table spilling -->
<!-- TODO: "Try it" link to a copyable template sheet -->

```
=TRUTHTABLE("AB + C'")
```

| A   | B   | C   | AB + C' |
| --- | --- | --- | ------- |
| 0   | 0   | 0   | 1       |
| 0   | 0   | 1   | 0       |
| 0   | 1   | 0   | 1       |
| 0   | 1   | 1   | 0       |
| 1   | 0   | 0   | 1       |
| 1   | 0   | 1   | 0       |
| 1   | 1   | 0   | 1       |
| 1   | 1   | 1   | 1       |

## Functions

| Function                                        | Returns                                                         | Example                                                    |
| ----------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| `TRUTHTABLE(expression, [order])`               | Header row, then one row of inputs + output per combination     | `=TRUTHTABLE("A ^ B")`                                     |
| `MINTERMS(expression, [order])`                 | Row numbers where the output is 1, as a single row              | `=MINTERMS("AB + C")` → `1 3 5 6 7`                        |
| `MAXTERMS(expression, [order])`                 | Row numbers where the output is 0, as a single row              | `=MAXTERMS("AB + C")` → `0 2 4`                            |
| `EVALLOGIC(expression, values...)`              | `1` or `0` for the given inputs, assigned in alphabetical order | `=EVALLOGIC("A & !B", A2, B2)`                             |
| `MINIMIZE(expression, [order])`                 | Minimal sum of products                                         | `=MINIMIZE("AB + A'C + BC")` → `AB + A'C`                  |
| `MINIMIZE_M(n, minterms, [dontCares], [names])` | Minimal sum of products from a minterm list                     | `=MINIMIZE_M(4, {1,3,7,11,15}, {0,2,5})` → `A'B' + CD`     |
| `EQUIVALENT(expression1, expression2)`          | `TRUE` if both give the same output for every input             | `=EQUIVALENT("A ^ B", "(A\|B)&!(A&B)")` → `TRUE`           |
| `KMAP(expression, [order])`                     | Karnaugh map for 2–4 variables, rows/columns in Gray-code order | `=KMAP("AB + C'")`                                         |
| `KMAP_M(n, minterms, [dontCares], [names])`     | Karnaugh map from a minterm list, don't-cares shown as `X`      | `=KMAP_M(4, {1,3,7,11,15}, {0,2,5})`                       |
| `SCHEMDRAW(expression, [label])`                | The expression in Schemdraw's logic syntax, for gate diagrams   | `=SCHEMDRAW("E'S'W", "GW")` → `GW = not E and not S and W` |

- **Variable order.** Variables are sorted alphabetically (case-insensitive, with `X2` before `X10`), and the first one is the most significant bit. Pass an order to change that: `=TRUTHTABLE("C & A", "C,A")`. The order can be a comma- or space-separated string or a range of cells. It can also add variables the expression doesn't use, which then show up as extra input columns.
- **Outputs** are the numbers `1` and `0` (`EQUIVALENT` returns `TRUE`/`FALSE`). `MINTERMS`/`MAXTERMS` return a blank cell when the list is empty.
- **Minimizing.** `MINIMIZE` and `MINIMIZE_M` return the sum of products with the fewest terms, then the fewest literals, in textbook notation (`AB + C'`). This is the same answer a correctly circled Karnaugh map gives. Multi-letter names are joined with `·` (`En·Clk + X1`). `MINIMIZE_M` names its variables `A`, `B`, `C`, … (A = most significant bit) unless you pass names like `"X,Y,Z"`. Minterm and don't-care lists can be a range, an array like `{1,3,5}`, or text like `"1,3,5"`.
- **K-maps.** The first variables label the rows (1 for 2–3 variables, 2 for 4) and the rest the columns, both in Gray-code order (`00 01 11 10`) so adjacent cells, including wrap-around, differ in one variable. The cell at row `01`, column `10` of a 4-variable map is minterm `0110` = 6. `=KMAP("AB + C'")` gives:

  | A\BC | 00  | 01  | 11  | 10  |
  | ---- | --- | --- | --- | --- |
  | 0    | 1   | 0   | 0   | 1   |
  | 1    | 1   | 0   | 1   | 1   |

- **Limits.** Truth tables, minterms, maxterms and `EQUIVALENT` allow up to 12 variables (4096 rows). Minimization allows up to 10.
- **Errors.** Bad input shows `#ERROR!`. Hover over it to see the reason, e.g. `Missing ')' to close '(' at position 5`.

## Gate diagrams for lab reports

`SCHEMDRAW` turns an expression into the syntax of [Schemdraw](https://schemdraw.readthedocs.io/)'s logic parser, and [`tools/schemdraw/draw.py`](tools/schemdraw/draw.py) draws it as a gate diagram (SVG or PNG):

1. In the sheet: `=SCHEMDRAW(MINIMIZE_M(3, {1}, , "E,S,W"), "GW")` → `GW = not E and not S and W`.
2. Copy one or more of those cells into a text file, e.g. `lights.txt`, one per line.
3. Draw them (needs Python 3.9+ once: `pip install -r tools/schemdraw/requirements.txt`):

   ```sh
   python tools/schemdraw/draw.py -f lights.txt -o diagrams              # diagrams/GW.svg, …
   python tools/schemdraw/draw.py "GW = not E and not S and W" --format png  # PNG also needs matplotlib
   ```

A chain like `A & B & C` becomes one 3-input gate, and `not (A and B)` becomes a NAND. Schemdraw ranks XOR below OR (the opposite of the grammar here), so the export parenthesises every mixed-operator operand. A CI job checks 500 random expressions against Schemdraw's own parser.

## Expression syntax

Both programmer and textbook notation work, and you can mix them.

| Operator | Tokens                                   | Precedence  |
| -------- | ---------------------------------------- | ----------- |
| NOT      | `!A` `~A` `¬A`, postfix `A'`             | 1 (highest) |
| AND      | `&` `*` `·` `∧`, or juxtaposition (`AB`) | 2           |
| XOR      | `^` `⊕`                                  | 3           |
| OR       | `\|` `+` `∨`                             | 4 (lowest)  |
| Grouping | `( )`                                    |             |
| Constant | `0` `1`                                  |             |

Binary operators are left-associative. Postfix `'` applies to the operand right before it: in `AB'` only `B` is negated, while `(AB)'` negates the whole group.

Identifiers are letters, digits and `_`, and must start with a letter or `_` (`A`, `En`, `X1`, `carry_in`). Names are case-sensitive.

### Juxtaposition: when does `AB` mean A·B?

Writing letters next to each other means AND (`AB + C'` = `A·B + C'`), **unless any of these is true**:

1. The expression uses an explicit AND operator (`&`, `*`, `·` or `∧`).
2. Some identifier contains a digit or underscore (`X1`, `carry_in`).
3. The variable order you pass names a variable longer than one letter.

In those cases every run of letters is a single identifier, and two operands side by side without an operator is an error.

| Expression | Order  | Parsed as               |
| ---------- | ------ | ----------------------- |
| `AB + C'`  |        | `A·B + C'`              |
| `A'B(C+D)` |        | `A'·B·(C+D)`            |
| `En & X`   |        | `En·X` (rule 1)         |
| `X1 + Y`   |        | `X1 + Y` (rule 2)       |
| `En + X`   | `En,X` | `En + X` (rule 3)       |
| `En + X`   |        | `E·n + X` ⚠️            |
| `X1 Y`     |        | error: missing operator |

If you use multi-letter names without an explicit AND, pass the variable order (or use `&`).

## How it works

```
"AB + C'" ──lexer──▶ tokens ──parser──▶ AST ──evaluate × 2ⁿ──▶ truth table ──▶ minterms / maxterms
                                         OR
                                       ╱    ╲
                                    AND      NOT
                                   ╱   ╲       │
                                  A     B      C
```

1. **Lexer** ([`lexer.ts`](packages/core/src/lexer.ts)) turns the string into tokens and applies the juxtaposition rule above.
2. **Parser** ([`parser.ts`](packages/core/src/parser.ts)) is a hand-written recursive-descent parser with one function per precedence level. It inserts an implicit AND wherever two operands sit side by side.
3. **Evaluator** ([`ast.ts`](packages/core/src/ast.ts)) walks the tree for each of the 2ⁿ input rows ([`truthTable.ts`](packages/core/src/truthTable.ts)).
4. **Minimizer** ([`minimize.ts`](packages/core/src/minimize.ts)) takes the minterms (plus any don't-cares):
   - **Quine–McCluskey** merges minterms that differ in one bit, level by level, until nothing merges. What's left are the _prime implicants_, the biggest possible groups (the K-map circles).
   - **Cover selection** picks the cheapest set of primes covering every minterm. It takes _essential_ primes (the only ones covering some minterm), drops dominated rows and columns, and repeats.
   - **Petrick's method** settles whatever cyclic core is left. Each minterm becomes a clause "P1 or P3 or P4", and the cheapest product of those clauses is the answer. It's found by branch and bound rather than multiplying everything out, which blows up on large functions.

   Tests check the result against brute force for all 256 three-variable functions, and that random expressions minimize to something equivalent and never longer.

## Architecture

```
packages/core   pure TypeScript with zero Google dependencies: parser, evaluator, truth tables
apps/sheets     thin Google Sheets adapter: range/empty-cell handling + @customfunction stubs
scripts/        build script that produces a clasp-pushable build/
```

The core doesn't know Sheets exists. It takes strings and arrays and returns plain values, so it can be reused in Node, in a browser, or behind an Excel add-in. The Sheets layer only turns cell arguments (2D range arrays, empty cells) into core calls.

Apps Script brings two constraints that shape the build ([`scripts/build.mjs`](scripts/build.mjs)):

- Custom functions must be **top-level global `function` declarations**, and a bundler would hide them inside a closure. So the adapter and core are bundled by esbuild into `build/core.js` as one IIFE that exposes a `SheetsLogic` global. Separately, [`functions.ts`](apps/sheets/src/functions.ts) is transpiled **without bundling** into `build/functions.js` as one-line global stubs that call `SheetsLogic`.
- clasp 3 doesn't compile TypeScript, so everything is compiled to JS before pushing. The `@customfunction` JSDoc that Sheets uses for autocomplete survives because the stubs go through `tsc`, which keeps comments (esbuild strips them).

```
build/
├── appsscript.json   manifest (V8 runtime)
├── core.js           var SheetsLogic = (() => { …core + adapter… })();
└── functions.js      function TRUTHTABLE(expression, varOrder) { return SheetsLogic.truthTable(…); } …
```

A test ([`build.test.ts`](apps/sheets/test/build.test.ts)) loads the built files into an empty `vm` context, the way Apps Script does, and calls the functions as globals.

## Development

Requires Node 22.12+.

```sh
npm install
npm test             # unit tests (Vitest)
npm run coverage     # with coverage (≥90% enforced on the core)
npm run typecheck    # tsc --build, strict mode
npm run lint         # ESLint (typescript-eslint strict, type-checked)
npm run format       # Prettier
npm run build        # → build/
```

### Pushing to Google Sheets

One-time setup:

1. Enable the Apps Script API at <https://script.google.com/home/usersettings>.
2. Log in: `npx clasp login` (opens a browser for OAuth).
3. Create a spreadsheet with a bound script project, from the repo root:

   ```sh
   npx clasp create --type sheets --title "sheets-logic" --rootDir build
   ```

   This writes `.clasp.json` (see [`.clasp.example.json`](.clasp.example.json)) and prints the new spreadsheet's URL. To use an existing sheet instead, copy `.clasp.example.json` to `.clasp.json` and fill in the script ID from _Extensions → Apps Script → Project Settings_.

`.clasp.json` is gitignored because it points at your own script. Never commit `~/.clasprc.json`, which holds your OAuth tokens.

Then:

```sh
npm run push         # build + clasp push
npm run push:watch   # build, push, then re-push whenever build/ changes (re-run `npm run build` to trigger)
```

Change the code here, not in the online Apps Script editor: `build/` is regenerated on every build, so editor changes get overwritten on the next push. `clasp push` asks before overwriting the remote manifest; answer yes when `appsscript.json` has changed on purpose.

## License

[MIT](LICENSE) © Zack Bolich
