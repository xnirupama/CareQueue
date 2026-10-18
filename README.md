# CareQueue

A React Native / Expo mobile app for iOS and Android, based on the CareQueue IT3060 HCI Figma prototype. It includes all 74 current patient, staff and admin high-fidelity screens, original Figma assets, connected navigation and stateful queue workflows, plus dedicated account pages and three illustrated welcome screens.

## Run

Use Node.js 22.13 or newer.

```sh
npm ci
cp .env.example .env
npm start
```

`npm start` explicitly launches **Expo Go** on port **8082**. Keep the terminal running, connect the phone and computer to the same Wi-Fi, and scan the new terminal QR code. On Android, scan inside Expo Go; on iPhone, use Camera and open the Expo Go link. Install an Expo Go build compatible with this project's **SDK 57** from [Expo's installation page](https://expo.dev/go?platform=android&sdkVersion=57&device=true).

If a previous server is running, stop it with Ctrl+C and use `npm run start:clear`. If the network blocks phone-to-computer connections, use `npm run start:tunnel`. See [Expo Go troubleshooting](docs/expo-go.md) for SDK compatibility, iPhone setup and connection checks. `npm run web` opens the browser preview. `npm run android` and `npm run ios` generate and run native projects using installed platform tooling.

Demo mode uses sample data saved only on the current device. The browser has patient/staff buttons beside the phone preview. Tap **Account** in the top navigation bar to open account and demo controls. Reset sample data from that page to repeat the complete flow. Administrator screens require an authorized live administrator account.

## Firebase

The connected project is **CareQueue**, project ID **carequeue-db90e**. Firestore Standard is provisioned in Mumbai (`asia-south1`); Email/Password sign-in and restrictive Firestore rules are enabled. It remains on the no-cost Spark plan. General OPD is initialized with an empty queue; no demo patients were seeded into the live database.

The public client settings are in `.env.example`. They are not administrator credentials. `.env` and credential files are ignored by Git. First launch shows three welcome screens, then a **Patient / Hospital staff / Administrator** sign-in chooser or **Create an account**. From demo mode, choose **Sign in to my account** on the account page. Live mode starts with empty data and never seeds fictitious patients into Firestore.

Registration requires choosing **Patient** or **Staff**. Patients can sign in immediately; staff requests wait for an administrator to approve access. The administrator account `nirupama.minipa@gmail.com` has been provisioned with the owner-approved admin claim. On first use, choose **Administrator ? Forgot password** to set the password privately through that inbox, then use **Administrator sign in**. Other administrator accounts require a trusted owner claim assignment. See [Firebase setup](docs/firebase-setup.md). Patient registration, token linking, queue calls, priority changes, recovery approvals, service updates and audit writes use authenticated Firestore transactions and listeners.

## Accounts and welcome screens

The role entry pages now use three locally bundled portrait photos, a soft mint background, compact photo cards and matching login/registration styling. Patient and Staff registration choices also show the corresponding portraits. These are generated fictional role illustrations, not user profile photos. [Portrait assets and exact prompts](assets/role-portraits/README.md) are included in the source.

- `/login`: mobile account-type chooser and patient/staff demo access.
- `/patient-login`, `/staff-login`, `/admin-login`: separate mobile sign-in forms. Firebase credentials and the saved account type/trusted role must match the selected portal; pending staff can use Staff sign in to view their status.
- `/register`: matching mobile layout with Patient/Staff selection, full name, email, password and confirmation. Registration creates the Firebase Authentication account and a Firestore `users/{uid}` profile including the selected `accountType`, then returns to Sign in with the email prefilled.
- `/staff-pending`: signed-in staff applicants see their saved request, account ID and **Check approval status**. Queue operations remain unavailable until approved.
- `/admin-login`: separate administrator sign-in; Firebase must verify an administrator custom claim. Patient/staff credentials cannot open the admin view, and admins use this portal rather than ordinary sign-in.
- `/staff-approvals`: from administrator Account, choose **Review staff registrations**, verify an applicant's hospital identity, approve, suspend, reactivate or revoke staff access. Approval is protected by Firestore rules; selecting Staff at registration does not grant permission.
- `/forgot-password`: request a reset email without disclosing whether an account exists.
- `/account`: view/copy the account ID, save a name, send/check email verification, change password after confirming current credentials, and sign out. Authorized staff/admin retain token linking and service initialization.
- `/onboarding`: three illustrated screens with Skip, Back, Next, page indicators and reduced-motion support. Completed welcome screens and selected live/demo mode persist on this device; replay from Account. Firebase handles the signed-in session without storing passwords in app state or preferences.

Protected routes require a signed-in account with a loaded database profile in live mode. Sign-out removes them from navigation history. Firestore stores `uid`, `fullName`, `email`, `accountType`, `createdAt` and `updatedAt` in `users/{uid}`. Firebase Authentication manages credentials; passwords and client-assigned roles are rejected by the profile rules. The registration choice is immutable after it is saved. Administrator-approved `staffAccess/{uid}` documents grant staff access; trusted legacy staff claims remain supported unless an explicit suspension/revocation denies access. Account name edits update Firestore and mirror the name to Authentication without altering a hospital registration record. Existing Authentication accounts receive a missing profile/account type at sign-in. See [account verification notes](docs/testing/accounts.md) for tested flows and remaining device checks.

Visible **Back** buttons use the previous app screen. Direct links without history return to the appropriate parent: login from registration/reset/admin sign-in, Account from staff approval pages and dashboard entry screens, and the role home from queue details, operations, scanner and display. Back from login can reopen the welcome screens. Welcome Back moves to the previous slide, or returns from the first slide when replayed. Back controls respect safe areas, provide screen-reader labels and a minimum 44-pixel touch area, and are disabled while the page is saving. Password reset opened from administrator sign-in returns to that portal. Back navigation does not submit forms or repeat queue actions.

## Workflows

- Patient: language-selection states, home, visit preparation, manual token retrieval, native QR scanning, queue status, preferences, caregiver authorization/revocation, approaching/your-turn states, directions, help, and recovery requests.
- Staff: register and review a patient, issue a unique token, call/recall, record a clinician-reviewed priority reason, approve recovery, publish a service update, record a device-local offline note, and explicitly reconcile it after reviewing duplicates.
- Admin: operation screens, incident review/verification, gated broadcast publication, read-only audit, report preparation and PDF export, status and notifications screens.

Registration forms validate names, optional phone numbers and the configured General OPD service. Recovery stays pending until staff approves it. Patient ticket linking uses the authenticated account ID, so another patient cannot retrieve a queue by guessing a token. Offline notes survive app restarts and remain pending if reconciliation fails.

## CRUD components

Open **My visit / Tools ? Account** or the feature cards in **Account** to access the mobile CRUD screens. Patients, staff and admins receive different tools and dashboards. The [complete CRUD inventory and demonstration guide](docs/crud-components.md) documents permissions, database records, source files and deletion behavior for all nine components:

- Queue/recovery: visit registrations, missed-turn requests, caregiver consent/sharing.
- Staff operations: editable/deletable device continuity notes and reconciliation.
- Administration: editable service announcements and staff approval/suspension/revocation.
- Support/accessibility: private support requests with staff replies; saved preference creation, editing and reset/deletion.
- Patient accounts: registration, profile viewing/editing and password-confirmed deletion after an active visit is closed.

Cancelling a visit preserves it; **Delete closed registration** physically removes it. Token numbers are never reused. Audit history remains immutable. Revoked staff access retains a denial record to block old staff claims. Patient account deletion preserves hospital history; delete private support requests separately if desired.

## Checks

```sh
npm run check
npm run export
npm run test:rules
npm run test:auth
npm run test:accounts
npm run test:firebase
```

The rules and account tests run local emulators under the isolated `demo-carequeue` project. They include six rule groups, twelve Auth/profile flow groups and seven SDK CRUD persistence groups, covering all three portals, staff access changes, account deletion, database ownership, actual create/read/update/delete operations and linked historical tickets. `npm test` runs 33 source/domain checks. The Auth emulator tests verification and reset links without sending real email. The live smoke test creates temporary patient and staff accounts, checks persistence and access restrictions, then removes its own accounts/documents. It never prints real credentials or sends real email.

See [design provenance](docs/design-source.md) and [verification and remaining setup](docs/verification.md).

## Device builds

`eas.json` includes development, preview and production profiles. EAS builds require your Expo account; App Store distribution also requires Apple signing credentials. Generated native projects and signing files are excluded from the repository.

The current [CareQueue-preview.apk](artifacts/CareQueue-preview.apk) was rebuilt on 17 October with separate Patient/Staff/Administrator sign-in, all nine CRUD components, protected role-based tools, Back navigation and the three welcome screens. APK signature, package/ARM64 compatibility, archive integrity and its 17 October source bundle were verified. [build-info.json](artifacts/build-info.json) records its hash and checks. The 18 October portrait and entry-page visual updates are in the source and Expo preview; rebuild the APK to include those changes in a standalone installation. Phone installation and visual testing remain pending. No signed iOS binary is claimed.

## Service boundaries

This version connects the General OPD queue. Other clinic statistics and historical chart series are supplied design examples; adding other services and audited analytics needs real service data. The supplied language-selection states are implemented; a complete translation of every screen is still separate work.

SMS and background push delivery require a configured provider/backend. Saving SMS preferences does not send messages. Caregiver access uses an ordinary account and explicit patient-controlled sharing; it does not send external messages. PDF export uses the platform print/share UI. Native camera, notification permissions, physical-device layout and app signing need device testing before hospital use.

The project was kept on Spark without enabling paid storage, SMS or other billing services. Provider, build and distribution costs depend on the services you enable.


## Milestone 03 submission materials

Read [submission checklist](docs/submission/README.md) for the supplied rubric and remaining evidence gates. The generated report PDF is currently absent from the workspace. Review and update [editable report content](docs/submission/report-content.json) before generating the final PDF; this is not a completed participant study or final authorship statement.

- [Requirements and interface register](docs/submission/traceability.json): FR01-FR12, NFR01-NFR07 and all 74 design states, with original interface mappings and the new role-based CRUD extension register.
- [Functional test plan](docs/testing/functional-tests.md): automated domain tests and pending device/multi-account cases.
- [Usability protocol](docs/testing/usability-protocol.md): five session forms, anonymized results and analysis.

On mobile, tap **Account** in the top navigation bar, then choose **My visit and settings** or **Queue operations**. These supplemental pages support patient preferences/caregiver sharing; staff registration/editing/queue state changes; admin availability, verified broadcasts, withdrawal and current-session report export. The account page also opens the designed screens. **Open token display** shows service/token information without patient names, phone numbers or clinical reasons.

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

`artifacts/CareQueue-preview.apk` assembled successfully and passed APK signature verification. It targets ARM64 Android devices with minimum API 24. Copy it to a compatible phone, open it from the Files app, and allow installation from that file source when Android asks. A fresh installation starts with the welcome screens and sign-in; demo access is available there. The APK includes its JavaScript bundle, so it does not need Metro running. Tap **Account** in the top navigation bar to open Account and the operational pages. Verify camera, printing/sharing, layouts, offline restart and connected-account flows before recording test results.

The APK is signed with the generated Android Debug certificate for local preview. `artifacts/build-info.json` records its SHA-256 and package details. Native builds and APK files remain excluded from Git; distribute the APK separately or as a repository release artifact after review.


For Java dependency-resolution failures on this Windows setup, the successful local build used a process-scoped IPv4 setting before running the helper:

```powershell
$env:JAVA_TOOL_OPTIONS = '-Djava.net.preferIPv4Stack=true'
```

The corrected JPEG asset is mapped through `design/asset-aliases.json`; its original bytes are unchanged. The build helper removes only the obsolete generated PNG copy when upgrading an older local build.
