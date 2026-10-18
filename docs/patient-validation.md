# Patient validation

Patient forms now use shared checks from `src/services/patient-validation.ts`. Checks run in the screens and again in the application services before writes. Firebase Authentication and Firestore ownership/role rules continue to enforce account and database permissions.

| Area | Checks and feedback |
| --- | --- |
| Registration and account name edits | Names must have 2–80 characters and contain a letter. English, Sinhala, Tamil, combining marks, initials, spaces, apostrophes and hyphens are accepted. Digits, markup and control characters are rejected. Leading/trailing spaces are removed and repeated spaces collapse before saving to the profile and Auth display name. |
| Email | Registration, sign-in and password-reset requests reject malformed addresses, empty domain labels, repeated local-part dots, control characters and addresses longer than 254 characters. Surrounding spaces are removed. This checks format; it does not prove inbox ownership. |
| New passwords | Registration, password changes and reset completion reject passwords consisting only of whitespace, in addition to the existing minimum length, confirmation and Firebase password-policy checks. Existing sign-in passwords remain compatible. |
| Phone numbers | Required for a caregiver; optional for counter patient registration. Accept a local 10-digit number starting with `0`, or `+94` followed by the nine-digit national number. Spaces and hyphens are accepted and removed before saving. Too few/many digits, letters and malformed prefixes are rejected. These checks do not verify ownership or deliver SMS. |
| Caregiver account ID | Optional; limited to 128 characters. Rejects email addresses, embedded whitespace, control characters, `/`, and the patient's own ID. An ID must be copied from the caregiver's Account page. Format checking does not look up or prove the existence of another account. |
| Caregiver sharing | Validates details before opening the consent confirmation. Sharing to an account requires an active linked waiting/called/missed visit. The database transaction also compares the current issued token with the screen's token, so an old screen cannot grant consent for a newer visit. Saving contact consent without an account ID remains available. |
| Queue token and QR | Requires `A` followed by 3–6 digits, with a positive numeric value. Rejects blank/zero tokens, other prefixes, oversized QR payloads and incorrectly typed JSON token fields. Accepts lowercase and surrounding spaces. The entered/scanned token must match the patient's linked token before redirecting to waiting, called, missed or recovery pages. Empty input no longer falls back silently to the linked token. |
| Recovery | Requires a description containing a letter or number, at most 500 characters; rejects blank, punctuation-only and unsupported control characters. Existing missed-turn and pending-status checks remain. Editing or withdrawing an old visit's request is rejected; live withdrawal compares the stored request and current ticket as well. |
| Patient support | Requires a supported category and a description containing a letter or number, at most 1,000 characters. Rejects blank, punctuation-only and unsupported control characters. An edit transaction checks that the request still exists and is open, providing a clear message if staff resolved it while the patient was editing. |
| Accessibility and alert settings | Only `en`, `si`, `ta` and actual boolean on/off values are saved. Invalid runtime values are rejected before persistence. Resetting preferences remains available. |

Inline errors appear beside invalid fields on registration, account name editing, password-reset email, caregiver, recovery and support forms. The original designed patient fields and alternate visit-tools forms use the same checks. Relevant inputs have character limits, phone/number keyboards and accessible error messages; recovery and support show character counts. Correcting a field clears its previous inline error. Live patient forms start without fictional caregiver contact details.

## Verification

Run `npm run check` for type checking, lint and unit/regression tests. `tests/patient-validation.test.mjs` covers native names, format and length boundaries, normalization, invalid service calls before database access, settings types, token parsing and stale recovery actions.

The isolated Firebase emulator suites `tests/auth-smoke.mjs` and `tests/crud-smoke.mjs` exercise real SDK authentication and persistence. The CRUD suite also checks that rejected phone numbers, self-sharing, invalid settings, stale visit shares/withdrawals and invalid support edits leave stored data unchanged. No production accounts, visits or emails are created by these tests.

Verified on 18 October 2026: type checking and lint passed without warnings; all 56 unit/regression tests passed; all 12 Auth/profile groups and all 8 CRUD/role-access groups passed against local emulators. Android, iOS and web exports passed. The Auth test loads the SDK and application services through the same module condition to avoid false network failures from mixed SDK imports. Pending-staff route guards and staff approval/access-refresh functions were restored during verification. See the [recorded results and source hashes](testing/patient-validation-verification.json).

Manual checks in Expo Go:

1. Create account → Patient: submit invalid name/email/password values, correct each error, and register using valid details.
2. Account: try saving `12345` as a name, then save a valid native-language name.
3. Caregiver sharing: try a short/long phone number and your own account ID. The consent dialog should appear only after field validation succeeds.
4. Retrieve queue: enter blank, `A000`, a different issued token, and your own token. Repeat with a missed/called visit; token checks must still run.
5. Recovery: try blank/punctuation-only reasons, then a meaningful description. Verify that staff decisions and visit changes prevent stale edits.
6. Patient support: try blank/punctuation-only messages, create a valid request, edit it, then resolve it as staff while its patient edit form is open.

Browser interaction and physical-device visual verification require a working browser runtime/device. Compiled exports and emulator tests do not replace those checks. The existing preview APK must be rebuilt to include these source changes.
