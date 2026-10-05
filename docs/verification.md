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
