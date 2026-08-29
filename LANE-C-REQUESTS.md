# Lane C — requests for supervisor / other lanes

1. **`docs/INTERACTIVE_VERIFICATION.md`** (not in Lane C's owned files) references two
   scripts Lane C archived to `scripts/archive/`:
   - line ~313: `npx ts-node test-quality-score.ts`
   - line ~316: `npx ts-node test-interactive.ts`
   These commands now point at the wrong path (`scripts/archive/test-quality-score.ts`,
   `scripts/archive/test-interactive.ts`). Whoever owns `docs/` should update the two
   run commands or drop them.

2. **`node_modules` tracking check** (requested verification): `git ls-files node_modules`
   returns 0 files — node_modules is NOT tracked in this repo. No action needed.
