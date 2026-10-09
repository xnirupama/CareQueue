# CareQueue

A React Native / Expo mobile app for iOS and Android, based on the CareQueue IT3060 HCI Figma prototype. It includes all 74 current patient, staff and admin high-fidelity screens, original Figma assets, connected navigation and stateful queue workflows, plus dedicated account pages and three illustrated welcome screens.

## Run

Use Node.js 22.13 or newer.

```sh
npm ci
cp .env.example .env
npm start
```

Open with a matching Expo Go installation, or create a development build when native capabilities require it. `npm run web` opens the browser preview. `npm run android` and `npm run ios` generate and run native projects using installed platform tooling.

Demo mode uses sample data saved only on the current device. The browser has patient/staff buttons beside the phone preview. On a phone, tap the upper left header (or long-press it) to open **Account and demo roles**. Reset sample data from that page to repeat the complete flow. Administrator screens require an authorized live administrator account.

## Firebase

The connected project is **CareQueue**, project ID **carequeue-db90e**. Firestore Standard is provisioned in Mumbai (`asia-south1`); Email/Password sign-in and restrictive Firestore rules are enabled. It remains on the no-cost Spark plan.

The public client settings are in `.env.example`. They are not administrator credentials. `.env` and credential files are ignored by Git. First launch shows three welcome screens, then **Sign in** or **Create an account**. From demo mode, choose **Sign in to my account** on the account page. Live mode starts with empty data and never seeds fictitious patients into Firestore.

Registration requires choosing **Patient** or **Staff**. Patients can sign in immediately; staff requests wait for an administrator to approve access. The first administrator needs an owner-controlled custom-claim assignment, then uses **Administrator sign in**. See [Firebase setup](docs/firebase-setup.md). Patient registration, token linking, queue calls, priority changes, recovery approvals, service updates and audit writes use authenticated Firestore transactions and listeners.

## Accounts and welcome screens

- `/login`: mobile layout matching the app header, navy buttons and rounded fields; Firebase email/password sign-in, field validation, password visibility and demo access.
- `/register`: matching mobile layout with Patient/Staff selection, full name, email, password and confirmation. Registration creates the Firebase Authentication account and a Firestore `users/{uid}` profile including the selected `accountType`, then returns to Sign in with the email prefilled.
- `/staff-pending`: signed-in staff applicants see their saved request, account ID and **Check approval status**. Queue operations remain unavailable until approved.
- `/admin-login`: separate administrator sign-in; Firebase must verify an administrator custom claim. Patient/staff credentials cannot open the admin view, and admins use this portal rather than ordinary sign-in.
- `/staff-approvals`: from administrator Account, choose **Review staff registrations**, verify an applicant's hospital identity, and approve staff access. Approval is protected by Firestore rules; selecting Staff at registration does not grant permission.
- `/forgot-password`: request a reset email without disclosing whether an account exists.
- `/account`: view/copy the account ID, save a name, send/check email verification, change password after confirming current credentials, and sign out. Authorized staff/admin retain token linking and service initialization.
- `/onboarding`: three illustrated screens with Skip, Back, Next, page indicators and reduced-motion support. Completed welcome screens and selected live/demo mode persist on this device; replay from Account. Firebase handles the signed-in session without storing passwords in app state or preferences.

Protected routes require a signed-in account with a loaded database profile in live mode. Sign-out removes them from navigation history. Firestore stores `uid`, `fullName`, `email`, `accountType`, `createdAt` and `updatedAt` in `users/{uid}`. Firebase Authentication manages credentials; passwords and client-assigned roles are rejected by the profile rules. The registration choice is immutable after it is saved. Administrator-approved `staffAccess/{uid}` documents grant staff access; trusted legacy staff claims also remain supported. Account name edits update Firestore and mirror the name to Authentication without altering a hospital registration record. Existing Authentication accounts receive a missing profile/account type at sign-in. See [account verification notes](docs/testing/accounts.md) for tested flows and remaining device checks.

## Workflows

- Patient: language-selection states, home, visit preparation, manual token retrieval, native QR scanning, queue status, preferences, caregiver authorization/revocation, approaching/your-turn states, directions, help, and recovery requests.
- Staff: register and review a patient, issue a unique token, call/recall, record a clinician-reviewed priority reason, approve recovery, publish a service update, record a device-local offline note, and explicitly reconcile it after reviewing duplicates.
- Admin: operation screens, incident review/verification, gated broadcast publication, read-only audit, report preparation and PDF export, status and notifications screens.

Registration forms validate names, optional phone numbers and the configured General OPD service. Recovery stays pending until staff approves it. Patient ticket linking uses the authenticated account ID, so another patient cannot retrieve a queue by guessing a token. Offline notes survive app restarts and remain pending if reconciliation fails.

## Checks

```sh
npm run check
npm run export
npm run test:rules
npm run test:auth
npm run test:accounts
npm run test:firebase
```

The rules and account tests run local emulators under the isolated `demo-carequeue` project. They verify patient/staff registration, restricted admin sign-in, administrator staff approval, revocation, profiles and password flows. The Auth emulator tests verification and reset links without sending real email. The live smoke test creates temporary patient and staff accounts, checks persistence and access restrictions, then removes its own accounts/documents. It never prints real credentials or sends real email.

See [design provenance](docs/design-source.md) and [verification and remaining setup](docs/verification.md).

## Device builds

`eas.json` includes development, preview and production profiles. EAS builds require your Expo account; App Store distribution also requires Apple signing credentials. Generated native projects and signing files are excluded from the repository.

The current [CareQueue-preview.apk](artifacts/CareQueue-preview.apk) was rebuilt on 9 October with Patient/Staff registration, administrator sign-in, protected staff approvals, mobile account forms and the three welcome screens. [build-info.json](artifacts/build-info.json) records the verified build contents, package and hash. Phone installation and visual testing are still pending. No signed iOS binary is claimed.

## Service boundaries

This version connects the General OPD queue. Other clinic statistics and historical chart series are supplied design examples; adding other services and audited analytics needs real service data. The supplied language-selection states are implemented; a complete translation of every screen is still separate work.

SMS and background push delivery require a configured provider/backend. Saving SMS preferences does not send messages. Caregiver access uses an ordinary account and explicit patient-controlled sharing; it does not send external messages. PDF export uses the platform print/share UI. Native camera, notification permissions, physical-device layout and app signing need device testing before hospital use.

The project was kept on Spark without enabling paid storage, SMS or other billing services. Provider, build and distribution costs depend on the services you enable.


## Milestone 03 submission materials

Read [submission checklist](docs/submission/README.md) for the supplied rubric and remaining evidence gates. The [consolidated report draft](output/pdf/IT3060HCI2026_Milestone03_GroupWE_79.pdf) has 23 main pages plus references/appendices. Review and update [editable report content](docs/submission/report-content.json); this is not a completed participant study or final authorship statement.

- [Requirements and interface register](docs/submission/traceability.json): FR01-FR12, NFR01-NFR07 and all 74 design states, with explicit per-interface CRUD gaps.
- [Functional test plan](docs/testing/functional-tests.md): automated domain tests and pending device/multi-account cases.
- [Usability protocol](docs/testing/usability-protocol.md): five session forms, anonymized results and analysis.

On mobile, tap the upper-left header, then choose **My visit and settings** or **Queue operations**. These supplemental pages support patient preferences/caregiver sharing; staff registration/editing/queue state changes; admin availability, verified broadcasts, withdrawal and current-session report export. The account page also opens the designed screens. **Open token display** shows service/token information without patient names, phone numbers or clinical reasons.

For caregiver access, register a separate account, copy its account ID, and let the patient save that ID in **Caregiver consent** after the patient's ticket is linked. The caregiver opens **Visits shared with me**. Sharing/revocation requires the updated Firestore rules to be deployed; consent-only saves do not send an external message.

The Firestore test emulator uses port **8180** to avoid a local Tomcat service on 8080. Use a supported Java runtime (this revision was checked with Java 23). `npm run test:rules` tests the isolated `demo-carequeue` project and does not deploy live rules.

### Android APK

Use the preview profile for a standalone APK; Expo documents the APK profile options at https://docs.expo.dev/build-reference/apk/.

```powershell
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

The preview profile contains the public client configuration from `.env.example`. First launch shows the welcome screens and then account sign-in; demo access is available from login and Account. The selected mode is remembered on the device. No administrator credentials belong in these values. EAS requires your Expo account; review the current build allowance in that account.

For a local Windows build with the Android SDK and Java configured:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1
```

The script generates Android files and requests an ARM64 preview APK with bundled JavaScript. It uses generated debug signing for local testing, not store distribution. It does not install onto a phone automatically. Verify the APK on an ARM64 Android device and record the build hash; use EAS or additional architectures for other devices.

For app-code-only updates with an existing generated Android project, add `-SkipPrebuild` to reuse native build outputs. Run normal prebuild when native dependencies or app configuration change.

### Report and usability analysis

```powershell
python scripts/analyze-usability.py docs/testing/usability-results.json
python -m venv tmp/pdf-runtime
tmp/pdf-runtime/Scripts/python.exe -m pip install reportlab pymupdf
tmp/pdf-runtime/Scripts/python.exe scripts/build-report.py
```

Edit the report JSON before rebuilding. Python/reportlab are only needed for document preparation, not to run the mobile app. Re-render and visually check the PDF after changes. Actual five-user sessions, member contributions, phone evidence and final repository/build links must be supplied by the group.


If Windows CMake reports `build.ninja still dirty after 100 tries`, obtain Ninja 1.12.1 from https://github.com/ninja-build/ninja/releases/tag/v1.12.1 and extract it to `tmp/ninja-1.12.1`. The local retry uses this project-local executable; the helper supports its explicit CMake override:

```powershell
$env:CAREQUEUE_NINJA = (Resolve-Path tmp/ninja-1.12.1/ninja.exe).Path
powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1
```

The helper leaves SDK executables in place. A dry run with the newer tool resolved the local manifest loop; native packaging must still succeed before claiming an APK.


### Verified local preview artifact

`artifacts/CareQueue-preview.apk` assembled successfully and passed APK signature verification. It targets ARM64 Android devices with minimum API 24. Copy it to a compatible phone, open it from the Files app, and allow installation from that file source when Android asks. A fresh installation starts with the welcome screens and sign-in; demo access is available there. The APK includes its JavaScript bundle, so it does not need Metro running. Tap the upper-left header to open Account and the operational pages. Verify camera, printing/sharing, layouts, offline restart and connected-account flows before recording test results.

The APK is signed with the generated Android Debug certificate for local preview. `artifacts/build-info.json` records its SHA-256 and package details. Native builds and APK files remain excluded from Git; distribute the APK separately or as a repository release artifact after review.


For Java dependency-resolution failures on this Windows setup, the successful local build used a process-scoped IPv4 setting before running the helper:

```powershell
$env:JAVA_TOOL_OPTIONS = '-Djava.net.preferIPv4Stack=true'
```

The corrected JPEG asset is mapped through `design/asset-aliases.json`; its original bytes are unchanged. The build helper removes only the obsolete generated PNG copy when upgrading an older local build.
