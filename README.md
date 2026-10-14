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

| Function                           | Returns                                                         | Example                             |
| ---------------------------------- | --------------------------------------------------------------- | ----------------------------------- |
| `TRUTHTABLE(expression, [order])`  | Header row, then one row of inputs + output per combination     | `=TRUTHTABLE("A ^ B")`              |
| `MINTERMS(expression, [order])`    | Row numbers where the output is 1, as a single row              | `=MINTERMS("AB + C")` → `1 3 5 6 7` |
| `MAXTERMS(expression, [order])`    | Row numbers where the output is 0, as a single row              | `=MAXTERMS("AB + C")` → `0 2 4`     |
| `EVALLOGIC(expression, values...)` | `1` or `0` for the given inputs, assigned in alphabetical order | `=EVALLOGIC("A & !B", A2, B2)`      |

- **Variable order.** Variables are sorted alphabetically (case-insensitive, with `X2` before `X10`), and the first one is the most significant bit. Pass an order to change that: `=TRUTHTABLE("C & A", "C,A")`. The order can be a comma- or space-separated string or a range of cells. It can also add variables the expression doesn't use, which then show up as extra input columns.
- **Outputs** are the numbers `1` and `0`. `MINTERMS`/`MAXTERMS` return a blank cell when the list is empty.
- **Limits.** Truth tables, minterms and maxterms allow up to 12 variables (4096 rows).
- **Errors.** Bad input shows `#ERROR!`. Hover over it to see the reason, e.g. `Missing ')' to close '(' at position 5`.

_Coming in M2: `MINIMIZE`, `MINIMIZE_M`, `EQUIVALENT`._

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
4. _(M2)_ **Quine–McCluskey + Petrick's method** for minimization.

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
