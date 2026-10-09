# Entering actual usability observations

Keep `usability-results.json` empty until sessions have actually occurred. The five Markdown forms are the easiest way to collect the observations; the JSON is the analysis input.

Each `participants` object requires: `id` (U01 etc.), `role`, `proxy` (boolean), `consent` (boolean, true only with consent), `app_build` (installed version/hash), and `date` (actual session date). Add `recording` and `consent_reference` where applicable. Keep identifying details outside the repository.

Each `attempts` object requires: `participant`, `task` (T01–T12), `outcome` (`independent`, `helped`, `unsuccessful`, or `blocked`). Optional measurements: `seconds` (nonnegative number), `ease` (integer 1–5), `errors`, `assistance`, `observation`, `timestamp`, and `round` (`initial` or a named retest). Unknown measurements must be null/absent, not guessed. One participant/task/round combination can occur only once.

Each `issues` object requires: `id`, `severity` (`high`, `medium`, `low`), `participants` (affected IDs), `tasks` (relevant task IDs), `evidence` (observation/recording reference), and optionally `fix_or_plan`. Affected participants must have attempted a relevant task. The tool reports affected/exposed counts separately.

Run:

```powershell
python scripts/analyze-usability.py docs/testing/usability-results.json
```

The summary keeps initial attempts separate from retests. It reports median completed-task times, sample counts, ease median/range and all outcome counts. Five registered names without task attempts do not meet the five-tested-participant gate. The result cannot establish whether a recruitment sample is representative; record and review the real/proxy roles yourself.
