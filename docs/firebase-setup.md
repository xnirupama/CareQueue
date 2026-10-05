# Firebase owner setup

Project: `carequeue-db90e`. The database and Email/Password provider already exist. Published rules match `firebase/firestore.rules`.

## Assign live roles

1. Create the staff/admin account in CareQueue using **Use my Firebase account**. Copy its account ID from that page or Firebase Authentication → Users.
2. On an owner-controlled machine or Google Cloud Shell, authenticate the Firebase Admin SDK using Application Default Credentials for this project. Keep administrator credentials outside this repository and outside the mobile application.
3. Run:

```sh
node scripts/admin.mjs USER_UID admin
node scripts/admin.mjs STAFF_UID staff
```

The script targets only `carequeue-db90e`. Users must sign out and sign in again to refresh their role. Patients cannot assign themselves a role, and the demo role selector has no authority in Firebase mode.

4. Sign in as admin, open the account page, and choose **Initialize General OPD**. It creates empty operation/service documents only if they do not exist. It never replaces an existing queue.
5. Staff can register a patient from the original Figma form. From the account page, link the issued token to the patient's account ID. This makes that user's queue status available without exposing another patient's details.

## Data contract

- `services/general-opd`: signed-in service summary only; no patient names or clinical reasons.
- `operations/current`: staff/admin queue and current operational state. Only admin can change incident verification.
- `patients/{uid}`: that user's preferences and caregiver consent. Profiles cannot contain a role.
- `tickets/{uid}`: staff-issued, patient-readable token and position.
- `recoveryRequests/{uid}`: a request tied to that user's issued ticket; staff decides the result.
- `audit/{eventId}`: immutable staff/admin event history. The current snapshot keeps the most recent 100 entries.

Offline notes are held on the device under the signed-in account ID. Reconciliation records them in the protected audit before clearing the local pending list. They are notes for staff review, not automatic clinical decisions or unverified queue overrides.

The local rules emulator verifies ownership, role escalation denial, staff-only writes, admin-only incident verification and staff-controlled recovery. Deploy future rule changes only after those checks pass:

```sh
npx firebase deploy --only firestore --project carequeue-db90e
```

That deployment command requires the owner's Firebase CLI login. No service-account key was created, stored or committed during initial setup.

## Delivery services

No paid SMS gateway or background push backend has been enabled. Before connecting either, implement explicit consent, recipient verification, delivery status and provider credentials on a trusted backend. Use Firebase App Check and an audited service architecture before handling real hospital records. Do not put backend credentials in `EXPO_PUBLIC_` values.
