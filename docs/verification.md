# Verification — 5 October 2026

## Confirmed locally

| Check | Result |
| --- | --- |
| TypeScript and Expo lint | Pass |
| Domain/navigation/source checks | 8 tests passed |
| Expo Doctor | 21 / 21 checks passed |
| Expo export | iOS and Android Hermes bundles and web bundle compiled |
| Firestore emulator | 3 tests passed: patient isolation, staff/admin permissions, staff-controlled recovery |
| Actual Firebase project smoke test | Email/password sign-in, own preferences, cross-patient denial, role escalation denial and invalid write denial passed; temporary verification account/profile removed |
| Prototype controls | All 474 current connections resolve; primary and secondary labels are present |
| Current Figma screen inventory | 74 screens: 32 patient, 23 staff, 19 admin |
| Browser render sweep | All 74 screen roots visible, populated and containing original SVG assets; dimensions recorded in [runtime-screens.json](evidence/runtime-screens.json) |

The render sweep checks screen availability and source assets. It is not a pixel-difference test or a physical-device test.

## Browser workflow evidence

The final preview was checked with local demonstration data. Registration entered **Demo Walk-in**, reviewed **A144**, issued that token once and increased the waiting count from 24 to 25. Incident review unlocked the broadcast centre. An edited service message carried into confirmation, and publication appeared in operational history alongside registration and verification.

- [Patient home](evidence/patient-home.jpg)
- [Staff dashboard](evidence/staff-dashboard.jpg)
- [Registration issued](evidence/registration-issued.jpg)
- [Admin overview](evidence/admin-overview.jpg)
- [Broadcast confirmation](evidence/broadcast-confirmed.jpg)
- [Recorded audit events](evidence/audit-events.jpg)

Patient queue navigation, Tamil and English selection, preference saving, caregiver authorization/revocation and pending recovery were also exercised in the browser.

- [Recovery awaiting staff review](evidence/recovery-pending.jpg) The workflow tests cover pending recovery, unique registration, clinical priority ordering, caregiver revocation and retry-safe confirmation actions. The isolated rules tests exercise staff writes, admin-only incident verification and staff-controlled recovery decisions.

## Firebase provisioning

**CareQueue / carequeue-db90e** exists on the Spark plan, with Firestore Standard in `asia-south1` and Email/Password enabled. The console shows the published rules revision dated 5 October, 9:51 PM Asia/Colombo. No billing upgrade or service-account key was created. No fictitious hospital data was seeded into the connected database.

Owner-assigned staff/admin roles and initial empty General OPD documents are still required before live queue use. Follow [Firebase owner setup](firebase-setup.md).

## Native packaging and service limits

The local Android release build failed after running out of disk space during the NDK download. Only files created by that attempt were cleaned up; approximately 4.7 GB free space was restored. No APK, signed iOS build, simulator result or physical-device result is claimed. The exported native JavaScript bundles compile, which does not establish native installation, permissions or device layout.

The prototype's printed-slip and channel-delivery labels are preserved design copy. Registration issues an application token; it does not prove a paper slip was printed. SMS and background push delivery need a provider/backend. Camera scanning, notifications, native PDF printing/sharing and offline use require physical-device checks. Full translations, additional clinic services, historical analytics and separate caregiver accounts remain outside this initial implementation.

A compatible `npm audit fix` was applied. The remaining audit reported **44 dependency advisories (14 moderate, 30 high)**, including Expo/Firebase/React Native transitive dependencies. Suggested automatic fixes require incompatible major-version changes, so they were not forced. Review supported upstream fixes and the service architecture before using this app for real hospital records.


## Milestone 03 follow-up - 7 October 2026

The supplied Milestones 01 and 02 reports and Assignment 3 brief were read. The brief requires a runnable/installable app, two CRUD operations per assigned interface, five working-app usability participants, traceability, and a consolidated report of at most 35 main pages.

Current checks: full npm check passed (TypeScript, lint and 21 domain/source tests); four current Firestore emulator tests passed, including limited caregiver access/revocation and recovery resubmission restrictions; web, Android and iOS bundle export completed. The emulator moved to 8180 because 8080 is occupied by Tomcat. Expected permission-denied messages occur in negative authorization tests.

Changes: empty live registration starts at A001; people ahead follows clinical call order; selected patient edits and explicit missed/completed/cancelled states; approved/rejected recovery; admin availability/withdrawal; measured current-session reports; device-note freshness preservation; account initialization guards; per-visit caregiver sharing and revocation; token-only display and platform print slips.

The review PDF has 23 main pages plus references/appendices (29 total). It was rendered and visually inspected. Source/report review archive excludes local environment files, credentials and caches. New management/display views still need visual/physical-device testing because the browser connection was unavailable. Archived screenshots are explicitly dated, not presented as current device evidence.

Final ARM64 APK compilation succeeded with the local SDK/JDK. Package and signature were verified; build-info.json records its hash. The required NDK installation succeeded. No installed-device or participant result is claimed. Updated cloud rules require owner Firebase CLI login, which is not currently configured. Actual member contributions, five app sessions, CRUD assignment scope, final phone/build evidence and publication of local changes remain submission gates. See docs/submission/README.md.


Native packaging fixes in this follow-up: installed NDK/CMake; used official project-local Ninja 1.12.1 to avoid the older Windows manifest loop; enabled Java IPv4 for dependency resolution; renamed a JPEG incorrectly named PNG without changing its bytes; removed that single stale generated PNG resource. Final build: 606 tasks, 24 executed and 582 up to date. This is an assembled/signature-verified APK, not a physical-device test.

## Account and welcome-screen extension - 8 October 2026

The account's project access was verified and the current Firestore rules were compiled, uploaded and released successfully to `carequeue-db90e` using `nirupama.minipa@gmail.com`.

Dedicated login, registration and password-reset pages now connect to Firebase Authentication. The account page supports name editing, email verification, password changes with reauthentication, UID display and sign-out, while retaining authorized token linking and General OPD initialization. Three new illustrated welcome screens include Skip/Back/Next, page indicators, reduced-motion support and saved completion. Live/demo mode persists; protected routes are removed on live sign-out.

TypeScript, lint and all 23 source/domain/account-validation tests passed. Five Auth emulator flow groups passed, including verification and reset-link completion without real email. Production account services also passed against a temporary live Firebase account, including password-policy checks, duplicate email rejection, sign-in/out, name edits, password change and Firestore access restrictions. The temporary account/profile were removed. Final Android/iOS/web exports succeeded.

The browser connection is unavailable. New welcome/account layouts, keyboard/autofill interaction, actual inbox delivery and device session persistence still require phone checks. See [account test notes](testing/accounts.md). This extension does not supply participant usability evidence or certify the per-member CRUD requirement.

The updated standalone ARM64 APK built successfully (606 tasks). APK signature, package `lk.carequeue.mobile`, minimum SDK 24, target SDK 36 and the new account/welcome bundle labels were verified. SHA-256: `1d1c193e271f9f74e5c6870ed3999c274d21adf0ce0364d20ada2e19898eaa9b`. The preview signing certificate matches the prior build. No Android device was attached for installation testing.

## Mobile registration and Firestore profiles - 9 October 2026

Login, registration and password reset now use the existing app's navy/white mobile header, typography, rounded fields/buttons and keyboard-aware scrolling. Web previews show the same single phone-sized form. Successful registration saves a private `users/{uid}` document and returns to Sign in with its email prefilled. The document contains UID, full name, email and server timestamps; Firebase Authentication manages passwords. Profile name edits persist to Firestore and mirror to Auth without changing clinic records. Sign-in restores a missing profile for an older Auth account; a denied database write is reported as incomplete registration and can be recovered with the original credentials.

TypeScript, lint and all 23 source tests passed. Five rules tests and seven Auth/profile integration groups passed in the isolated emulators. The rules compiled and deployed successfully to `carequeue-db90e`; a temporary live account verified database profile creation, original-credential login, name editing and denied cross-user/password/role writes. Its own documents and Auth account were removed. Browser visual testing is unavailable and no Android device is attached.

All platform exports passed. The updated ARM64 APK built successfully in 13m 5s using existing native outputs (24 executed tasks, 582 up to date). Package, signature, archive CRC and mobile-form/registration-recovery labels in the standalone bundle were verified. SHA-256: `4f1df4237a003c75a4bd8af46b524860d1aa6261bcde8f52409ce92588570a1f`. Build metadata and the source review package were refreshed; phone installation/layout remains pending.
