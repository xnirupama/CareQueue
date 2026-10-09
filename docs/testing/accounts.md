# Account and welcome-screen verification

Implemented on 8 October 2026 as supplemental screens alongside the supplied 74 Figma states. These new illustrations and layouts are application extensions, not claimed original Figma exports.

## Available flows

First launch → three welcome screens → login → registration or password reset → role-based queue home → Account. Skip completes the welcome flow; Back/Next and page indicators move between all three screens. Account can replay it. The app remembers welcome completion and live/demo mode on the device. Firebase persists the signed-in account; passwords are not placed in AsyncStorage or Firestore profiles.

On 9 October, login, registration and reset were revised to use the app's mobile header, navy/white palette, rounded inputs and buttons, single-column form and keyboard-aware scrolling. The desktop web preview presents the same phone-sized screen.

Registration requires **Patient** or **Staff**, creates a Firebase Authentication account, and saves `users/{uid}` in Firestore with UID, full name, email, selected `accountType` and server timestamps. It then signs out and returns to Sign in with the email prefilled and confirmation shown. Login verifies those credentials and loads the saved profile. Old Auth accounts get a missing profile/account type on sign-in. If the database write fails, the app reports incomplete setup and signs out; the same credentials can recover a profile on a later login.

Patient registrations open the patient view. Staff registrations open **Staff approval pending** until an administrator verifies the applicant and approves access through Account → **Review staff registrations**. Approval is saved in the administrator-only `staffAccess/{uid}` collection. The staff member refreshes approval or signs in again to open the staff dashboard. Existing trusted staff claims also remain supported. **Administrator sign in** requires a verified Firebase administrator claim; patient/staff accounts are rejected, and no public administrator registration exists. Bootstrapping the first administrator requires an owner-selected account UID and trusted Admin SDK credentials.

Account provides editable name, selectable UID, email verification, password change with current-password reauthentication, and sign-out. Name edits save to Firestore and mirror to Authentication. Names on hospital registration records remain separate. Passwords are never placed in user-profile documents; profile rules reject elevated roles and changes to an already saved account type. Existing staff token linking and admin General OPD initialization remain available. Demo roles are limited to patient and staff; administrator views require authorized live sign-in.

## Automated results

- `npm run check`: TypeScript, lint and 25 source/domain/account-validation tests.
- Final web, Android and iOS exports passed on 9 October. See `artifacts/build-info.json` for the current APK contents, hash and native verification.
- `npm run test:accounts`: isolated `demo-carequeue` Auth and Firestore emulators; all six Firestore rule cases and eight Auth/profile flow groups passed on 9 October:
  - AT01: registration, saved name, duplicate email rejection, absence of an elevated role.
  - AT02: sign-out, incorrect credentials, sign-in and name update/reload.
  - AT03: verification email action, applying its link, and verified-state refresh.
  - AT04: wrong current password rejection, password change, old-password rejection, new-password login.
  - AT05: reset-link action, unknown-email handling, old-password rejection and reset-password login.
  - AT06: a denied profile write reports incomplete registration and signs out; login with the original credentials recovers the database profile.
  - AT07: an existing Auth account with no Firestore profile receives one at login. Repeated loading preserves creation time; editing changes the full name without changing identity or creation time.
  - AT08: staff registration saves the selected type but denies queue reads/self-approval; patient/staff admin login is rejected; a trusted emulator administrator must use the admin portal, approves the staff applicant, and enables their staff queue access. Deleting approval removes that access. Administrator claims are set only by the emulator's trusted test fixture.
- `npm run test:firebase`: on 9 October, production account services passed against `carequeue-db90e` for patient/staff registration, saved account type, matching-credential login, password-policy checks, duplicate email, invalid credentials, synchronized name edits, password changes, profile ownership/schema restrictions, pending staff isolation, denied self-approval and rejected unauthorized admin login. Temporary patient/staff Auth accounts and their own database documents were removed. No real verification/reset emails were sent, and no production administrator was created by the tests.

The Auth emulator does not implement Firebase's password-policy lookup. Only emulator connections skip that lookup; local minimum/matching checks and live Firebase policy validation remain enabled.

## Device and visual checks still required

The browser connection was unavailable in this session. Automated service checks and successful compilation do not verify touch interaction or layout on a phone.

1. Install the updated `artifacts/CareQueue-preview.apk` on an ARM64 Android phone. A new installation should show all three welcome screens. Use Account → **View the three welcome screens** to replay them after completion.
2. Check Skip, page indicators, Back, Next and Get started; restart to confirm completion is remembered. Enable reduced motion and a screen reader, then replay.
3. Create a test account with **Patient** selected. Confirm that submitting without a Patient/Staff choice is rejected; successful registration returns to Sign in with the prefilled email and success notice. Check invalid fields, mismatched passwords, password visibility, duplicate email, slow/offline connection, and keyboard/autofill on a small screen. Inspect Firestore → `users` → the UID for name/email/account type/timestamps, then sign in using the same credentials.
4. Edit its account name, reopen Account, force-close/restart, and confirm name/session persistence. Verify that the hospital-issued ticket name was not changed.
5. Request verification and reset emails to an inbox you control. Check inbox/spam, open the links, refresh verification status, and sign in using the reset password. Actual inbox delivery is not established by emulator tests.
6. Change the password, sign out, and confirm old credentials fail and new credentials work. Use OS Back after sign-out; live queue/account routes should require sign-in.
7. Register a separate **Staff** test account, then sign in. Confirm the pending screen, saved staff type, account ID and restricted queue navigation. Verify that **Check approval status** remains pending before approval.
8. Provision a designated administrator with the trusted setup. Choose **Administrator sign in** and confirm the admin view. Patient/staff credentials should be rejected there; administrator credentials entered in ordinary sign-in should direct the user to the admin portal. Confirm administrator access is unavailable in demo mode.
9. As admin, open Account → **Review staff registrations**, inspect the applicant and approve after identity verification. As staff, refresh approval or sign in again; confirm the staff dashboard and queue access. Check that the approved staff account still cannot open administrator views.
10. Switch to demo and back; confirm demo visits never appear in Firestore.
11. Sign in as a different user and confirm the first user's private preferences, offline notes and ticket are not shown.

These checks do not replace the five working-app usability sessions required by the assignment.

Implementation references: [Firebase password authentication](https://firebase.google.com/docs/auth/web/password-auth), [Firebase account management](https://firebase.google.com/docs/auth/web/manage-users), [Expo Router authentication](https://docs.expo.dev/router/advanced/authentication/).

Current role-enabled APK: signature, package, ARM64 runtime, archive CRC and registration/admin/approval bundle labels verified. SHA-256: `0426caaf9ce81a51f426caf86ba10db19edebc62a8787f4677401ea3293b2fa5`. Physical-device installation remains pending.
