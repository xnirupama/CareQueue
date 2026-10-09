# Firebase owner setup

Project: `carequeue-db90e`. The database and Email/Password provider already exist. The rules in `firebase/firestore.rules`, including private registration profiles, were successfully compiled and deployed on 9 October 2026 using `nirupama.minipa@gmail.com`.

## Assign live roles

1. Create each staff/admin account using CareQueue's **Create an account** page. In demo mode, first choose **Sign in to my account** from Account. Copy its account ID from Account or Firebase Authentication → Users. Registration always creates an ordinary patient account; the trusted assignment below grants staff/admin access.
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

- `users/{uid}`: the user's private registration profile: UID, full name, email and server-generated creation/update timestamps. Credentials are managed by Firebase Authentication. Profile rules reject passwords and role fields, prevent identity/creation-time changes, and deny access to other users and staff. Successful registration returns to Sign in; signing in validates the credentials and loads this profile. Existing Auth accounts receive a missing profile on sign-in. Account name changes update this document and mirror the name to Auth.
- `services/general-opd`: signed-in service summary only; no patient names or clinical reasons.
- `operations/current`: staff/admin queue and current operational state. Only admin can change incident verification.
- `patients/{uid}`: that user's preferences and caregiver consent. Profiles cannot contain a role.
- `tickets/{uid}`: staff-issued, patient-readable token and position.
- `recoveryRequests/{uid}`: a request tied to that user's issued ticket; staff decides the result.
- `audit/{eventId}`: immutable staff/admin event history. The current snapshot keeps the most recent 100 entries.

Offline notes are held on the device under the signed-in account ID. Reconciliation records them in the protected audit before clearing the local pending list. They are notes for staff review, not automatic clinical decisions or unverified queue overrides.

The five local rules tests verify registration-profile ownership/schema, role escalation denial, staff-only writes, admin-only incident verification and staff-controlled recovery. The combined account tests also verify profile persistence, login with the same credentials, migration of missing profiles and recovery after a denied profile write. Deploy future rule changes only after those checks pass:

```sh
npx firebase deploy --only firestore:rules --project carequeue-db90e
```

That deployment command requires a Firebase CLI account with project deployment permissions. No service-account key was created, stored or committed during initial setup.

## Fix deployment HTTP 403 (project access)

The `serviceusage.services.use` error is a Google Cloud IAM/account-access failure. Firestore document rules do not grant deployment access.

Check the CLI identity and accessible projects:

```powershell
npx firebase login:list
npx firebase projects:list
```

On 7 October 2026, the checked CLI account was `nirupama.minipa@gmail.com` and its accessible-project list contained only `nearmelk`, not `carequeue-db90e`. On 8 October, access was verified for both projects and the Firestore rules deployment completed successfully with that same account.

If CareQueue belongs to another Google account, add that account and select it for this project directory. Replace the example email with the actual project owner's email:

```powershell
npx firebase login:add owner@example.com
npx firebase login:use owner@example.com
npx firebase projects:list
npx firebase deploy --only firestore:rules --project carequeue-db90e
```

Complete the Google sign-in in the browser. Confirm that `carequeue-db90e` appears before deploying. Adding/selecting an account preserves the existing login for other projects. If the intended account is already listed by `login:list`, skip `login:add` and use `login:use`.

If the current account is intended to deploy, the project owner/IAM administrator must open [CareQueue IAM](https://console.cloud.google.com/iam-admin/iam?project=carequeue-db90e), grant access to that exact email, and add **Service Usage Consumer** (`roles/serviceusage.serviceUsageConsumer`). This supplies the missing `serviceusage.services.use` permission. Rules deployment also requires rules-management permissions, such as **Firebase Rules Admin** (`roles/firebaserules.admin`), unless an existing role already supplies them. Wait a few minutes for IAM changes to propagate, then check projects and retry the command above. An existing Owner or Editor role already includes the Service Usage permission; check the selected account/project before adding duplicate roles.

CareQueue currently uses Firebase Authentication and Firestore. `firebase.json` has no Storage deployment configuration, and the app does not use Firebase Storage. Omit `,storage`; no Storage setup or billing change is needed for this rules deployment. To deploy the configured indexes separately, use `npx firebase deploy --only firestore:indexes --project carequeue-db90e` after access is fixed.

References: [Firebase CLI account commands](https://firebase.google.com/docs/cli), [Service Usage IAM roles](https://docs.cloud.google.com/service-usage/docs/access-control), [Firebase Rules IAM roles](https://docs.cloud.google.com/iam/docs/roles-permissions/firebaserules).

## Delivery services

No paid SMS gateway or background push backend has been enabled. Before connecting either, implement explicit consent, recipient verification, delivery status and provider credentials on a trusted backend. Use Firebase App Check and an audited service architecture before handling real hospital records. Do not put backend credentials in `EXPO_PUBLIC_` values.


## Limited caregiver account access (Milestone 03)

The deployed Milestone 03 rules add `caregiverShares/{patientUid}`. The patient can grant a specific caregiver account ID access to token, status and people ahead. Staff queue transactions refresh those fields. The caregiver cannot read the patient's profile or full ticket. Revocation deletes the share. The four emulator rule tests passed before deployment; rerun them before deploying future rules changes.

1. Register the caregiver as an ordinary CareQueue account and copy their account ID.
2. Link the patient's issued ticket as staff.
3. As the patient, open **My visit and settings**, enter the caregiver name, phone and account ID, review and confirm consent.
4. As the caregiver, open **My visit and settings** and read **Visits shared with me**.
5. Revoke as patient, then verify that the caregiver no longer has access. SMS/background delivery remains separate.

The management extension also provides edit, complete, missed and cancelled visit states, explicit recovery approval/rejection, availability changes and broadcast withdrawal. Current-session waiting reports use measured call timestamps. Do not interpret the original static chart artwork as live historic statistics.
