# Nonlinear causal bootstrap failure

The guarded production pass stopped before committing implementation files.

**Failed stage:** Check UI codemod syntax

```text

===== Install dependencies =====

added 250 packages, and audited 251 packages in 7s

64 packages are looking for funding
  run `npm fund` for details

5 high severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.

===== Repair guarded UI codemod literals =====

===== Check core codemod syntax =====

===== Check UI codemod syntax =====
/home/runner/work/the-annex/the-annex/scripts/apply-nonlinear-ui.mjs:822
  `## Nonlinear causal gameplay pass (2026-07-30)

SyntaxError: missing ) after argument list
    at checkSyntax (node:internal/main/check_syntax:74:5)

Node.js v22.23.1
```
