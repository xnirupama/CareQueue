# Functional test execution log

Automated workflow/source checks: **21/21 passed on 7 October 2026** using direct Node execution of `completion.test.mjs` (13) and `workflows.test.mjs` (8). Full npm check (TypeScript + lint + tests) also passed. Four current Firestore emulator rule tests passed, including caregiver authorization/revocation and recovery resubmission restrictions. Web/Android/iOS export succeeded. These are domain/source checks; they do not demonstrate device installation, external delivery or usability.

8 October account extension: the source suite now includes two account-validation/error tests (23 total). Production account services passed the isolated Auth emulator and a temporary live Firebase account check; see [account results and pending phone checks](accounts.md). The earlier report PDF remains a review draft; reconcile these supplemental interfaces and new evidence before submitting it.

New cases FT01–FT13: first/unique registration; priority-aware queue position; selected-record edit; missed/completed/cancelled transitions; approve/reject recovery; service/admin restrictions; patient mutation denial; measured reporting; manual-note validation/retry. Existing cases W01–W08 cover pending recovery, atomic registration, priority call, verified publication, caregiver revocation, local assets, 474 prototype connections and button labels.

| Manual case | Requirements | Procedure | Expected result | Actual result / evidence |
| --- | --- | --- | --- | --- |
| MT01 | FR01, FR07, NFR03 | On two phones sign in patient/staff, register/link a fictional patient, call it; time confirmation-to-patient update over five repetitions | Correct linked ticket; report each latency and whether ≤5s | NOT EXECUTED |
| MT02 | FR02, FR08 | Link three patients, reprioritize the last, compare every ticket and next call | All positions reflect actual priority order; estimate labelled approximate | NOT EXECUTED |
| MT03 | FR03, FR04 | Enable app preferences; move queue close to the patient, call it, publish delay/unavailable, cancel visit | In-app correct states; SMS/background delivery separately marked blocked until configured | NOT EXECUTED |
| MT04 | FR05, NFR02 | Open preparation/directions/help and token display; print selected slip | Readable guidance; display/slip has token, no names/phone/clinical reasons | NOT EXECUTED; hospital directions unconfirmed |
| MT05 | FR06 | Save/read/revoke caregiver consent and test recipient login/access | Consent state persists; actual recipient receives only authorized updates | NOT EXECUTED; separate recipient access not implemented |
| MT06 | FR07, NFR07 | Concurrent staff registration, selected edit and cancellation; attempt patient writes | Unique tokens, intended record only, patient denied | NOT EXECUTED |
| MT07 | FR09 | Mark a call missed, request patient recovery, decide as staff, repeat decision on another device | Pending until decision; approved/rejected visible; stale decision denied | NOT EXECUTED |
| MT08 | FR10, FR11 | Record call times, view metrics/export PDF, publish/withdraw broadcast; inspect audit | Correct current-session counts/times; one publication; preserved audit | NOT EXECUTED |
| MT09 | FR12, NFR04–05 | Disconnect, note a paper action, restart app, reconnect, review and reconcile | Warning and pending note survive; archive only after review; no duplicate action | NOT EXECUTED |
| MT10 | NFR01–02, NFR06–07 | Small/large phone, screen reader, larger text, keyboard, denied camera permission, staff/admin role refresh, logout/login another user | Usable controls, no clipped critical text, explicit permission state and no account-data mixing | NOT EXECUTED |

Record date, tester, build/source commit, mode, devices/accounts, steps, exact result, evidence path, defect ID and retest. Use fictional records. Keep raw test accounts/passwords out of submission evidence.

FT10–FT13 additionally verify that private changes do not fake a fresh queue timestamp, preference writes contain only permitted fields, native raster extensions match signatures, and called/ended visits do not display waiting estimates.
