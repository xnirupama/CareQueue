# CareQueue

A React Native / Expo mobile app for iOS and Android, based on the CareQueue IT3060 HCI Figma prototype. It includes all 74 current patient, staff and admin high-fidelity screens, original Figma assets, connected navigation and stateful queue workflows.

## Run

Use Node.js 22.13 or newer.

```sh
npm ci
cp .env.example .env
npm start
```

Open with a matching Expo Go installation, or create a development build when native capabilities require it. `npm run web` opens the browser preview. `npm run android` and `npm run ios` generate and run native projects using installed platform tooling.

Demo mode uses sample data saved only on the current device. The browser has patient/staff/admin buttons beside the phone preview. On a phone, long-press the upper left header to open **Account and demo roles**. Reset sample data from that page to repeat the complete flow.

## Firebase

The connected project is **CareQueue**, project ID **carequeue-db90e**. Firestore Standard is provisioned in Mumbai (`asia-south1`); Email/Password sign-in and restrictive Firestore rules are enabled. It remains on the no-cost Spark plan.

The public client settings are in `.env.example`. They are not administrator credentials. `.env` and credential files are ignored by Git. Choose **Use my Firebase account** on the account page to switch from sample data to the connected service. A new patient can create an account there. Live mode starts with empty data and never seeds fictitious patients into Firestore.

Live staff and admin roles need an owner-controlled assignment after those users create accounts. See [Firebase setup](docs/firebase-setup.md). Patient registration, token linking, queue calls, priority changes, recovery approvals, service updates and audit writes use authenticated Firestore transactions and listeners.

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
npm run test:firebase
```

The rules test runs a local emulator under the isolated `demo-carequeue` project. The live smoke test creates a temporary verification account in the configured project, checks patient isolation and invalid writes, and removes only its own account/profile. It never prints credentials.

See [design provenance](docs/design-source.md) and [verification and remaining setup](docs/verification.md).

## Device builds

`eas.json` includes development, preview and production profiles. EAS builds require your Expo account; App Store distribution also requires Apple signing credentials. Generated native projects and signing files are excluded from the repository.

The local Android APK attempt encountered insufficient disk space while downloading the NDK. Temporary build files were cleaned up. No installable APK or signed iOS binary is claimed by this repository's initial verification. Free additional disk space before retrying a native build, or use your configured EAS build environment.

## Service boundaries

This version connects the General OPD queue. Other clinic statistics and historical chart series are supplied design examples; adding other services and audited analytics needs real service data. The supplied language-selection states are implemented; a complete translation of every screen is still separate work.

SMS and background push delivery require a configured provider/backend. Saving SMS preferences does not send messages. Caregiver authorization records consent and sharing preferences; it does not yet create a separate caregiver login or send external messages. PDF export uses the platform print/share UI. Native camera, notification permissions, physical-device layout and app signing need device testing before hospital use.

The project was kept on Spark without enabling paid storage, SMS or other billing services. Provider, build and distribution costs depend on the services you enable.
