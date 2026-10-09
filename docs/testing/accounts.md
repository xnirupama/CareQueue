# Account and welcome-screen verification

Implemented on 8 October 2026 as supplemental screens alongside the supplied 74 Figma states. These new illustrations and layouts are application extensions, not claimed original Figma exports.

## Available flows

First launch → three welcome screens → login → registration or password reset → role-based queue home → Account. Skip completes the welcome flow; Back/Next and page indicators move between all three screens. Account can replay it. The app remembers welcome completion and live/demo mode on the device. Firebase persists the signed-in account; passwords are not placed in AsyncStorage or Firestore profiles.

On 9 October, login, registration and reset were revised to use the app's mobile header, navy/white palette, rounded inputs and buttons, single-column form and keyboard-aware scrolling. The desktop web preview presents the same phone-sized screen.

Registration now creates a Firebase Authentication account and saves `users/{uid}` in Firestore with UID, full name, email and server timestamps. It then signs out and returns to Sign in with the email prefilled and confirmation shown. Login verifies those credentials and loads the saved profile before opening the queue. Old Auth accounts get a missing profile on sign-in. If the database write fails, the app reports incomplete setup and signs out; the same credentials can recover the profile on a later login.

All new accounts start as patients; staff/admin claims are assigned using the existing trusted setup. Account provides editable name, selectable UID, email verification, password change with current-password reauthentication, and sign-out. Name edits save to Firestore and mirror to Authentication. Names on hospital registration records remain separate. Passwords are never placed in user-profile documents; profile rules also reject role assignment. Existing staff token linking and admin General OPD initialization remain available.

## Automated results

- `npm run check`: TypeScript, lint and 23 source/domain/account-validation tests.
- Final web, Android and iOS exports passed on 9 October. The updated ARM64 Android APK built successfully; its package, signature, archive integrity and bundled mobile-form/registration-profile labels were verified. Build SHA-256: `4f1df4237a003c75a4bd8af46b524860d1aa6261bcde8f52409ce92588570a1f`. See `artifacts/build-info.json`.
- `npm run test:accounts`: isolated `demo-carequeue` Auth and Firestore emulators; all five Firestore rule cases and seven Auth/profile flow groups passed on 9 October:
  - AT01: registration, saved name, duplicate email rejection, absence of an elevated role.
  - AT02: sign-out, incorrect credentials, sign-in and name update/reload.
  - AT03: verification email action, applying its link, and verified-state refresh.
  - AT04: wrong current password rejection, password change, old-password rejection, new-password login.
  - AT05: reset-link action, unknown-email handling, old-password rejection and reset-password login.
  - AT06: a denied profile write reports incomplete registration and signs out; login with the original credentials recovers the database profile.
  - AT07: an existing Auth account with no Firestore profile receives one at login. Repeated loading preserves creation time; editing changes the full name without changing identity or creation time.
- `npm run test:firebase`: on 9 October, the same production account services passed against `carequeue-db90e` for registration/password-policy checks, Firestore user-profile persistence, login with the original credentials, duplicate email, invalid credentials, synchronized name edits, password changes, and profile ownership/schema/role restrictions. The temporary Auth account and both its user-profile and preferences documents were removed. No real verification/reset emails were sent by these checks.

The Auth emulator does not implement Firebase's password-policy lookup. Only emulator connections skip that lookup; local minimum/matching checks and live Firebase policy validation remain enabled.

## Device and visual checks still required

The browser connection was unavailable in this session. Automated service checks and successful compilation do not verify touch interaction or layout on a phone.

1. Install the updated `artifacts/CareQueue-preview.apk` on an ARM64 Android phone. A new installation should show all three welcome screens. Use Account → **View the three welcome screens** to replay them after completion.
2. Check Skip, page indicators, Back, Next and Get started; restart to confirm completion is remembered. Enable reduced motion and a screen reader, then replay.
3. Create an ordinary test account through the app. Confirm return to Sign in, the prefilled email and success notice. Check blank/invalid fields, mismatched passwords, password visibility, duplicate email, slow/offline connection, and keyboard/autofill behavior on a small screen. Inspect Firestore → `users` → the account UID for the saved name/email/timestamps, then sign in using the same credentials.
4. Edit its account name, reopen Account, force-close/restart, and confirm name/session persistence. Verify that the hospital-issued ticket name was not changed.
5. Request verification and reset emails to an inbox you control. Check inbox/spam, open the links, refresh verification status, and sign in using the reset password. Actual inbox delivery is not established by emulator tests.
6. Change the password, sign out, and confirm old credentials fail and new credentials work. Use OS Back after sign-out; live queue/account routes should require sign-in.
7. Switch to demo and back; confirm demo visits never appear in Firestore. Confirm staff/admin landing screens only after trusted claims are assigned and the user signs in again.
8. Sign in as a different user and confirm the first user's private preferences, offline notes and ticket are not shown.

These checks do not replace the five working-app usability sessions required by the assignment.

Implementation references: [Firebase password authentication](https://firebase.google.com/docs/auth/web/password-auth), [Firebase account management](https://firebase.google.com/docs/auth/web/manage-users), [Expo Router authentication](https://docs.expo.dev/router/advanced/authentication/).
