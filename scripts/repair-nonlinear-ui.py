from pathlib import Path

path = Path('scripts/apply-nonlinear-ui.mjs')
source = path.read_text()

replacements = [
    (
        """    setWorldLine(`${causalSiteState.title}. Procedural change acknowledged; ordinary methods are available.`)
""",
        """    setWorldLine(causalSiteState.title + '. Procedural change acknowledged; ordinary methods are available.')
""",
    ),
    (
        """  `                beatId={`${'${state.caseId}'}:field:${'${sceneBeat.actionId}'}`}
""",
        """  `                beatId={state.caseId + ':field:' + sceneBeat.actionId}
""",
    ),
    (
        """| Case 81 deposition close-up reuse (`public/images/case-81-deposition-annex.webp`) |""",
        """| Case 81 deposition close-up reuse (public/images/case-81-deposition-annex.webp) |""",
    ),
]

for before, after in replacements:
    count = source.count(before)
    if count != 1:
        raise SystemExit(
            f'expected exactly one guarded UI repair target, found {count}: {before!r}'
        )
    source = source.replace(before, after)

path.write_text(source)
print('repaired guarded UI codemod literals')
