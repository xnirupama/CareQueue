# Email code password reset

CareQueue now resets passwords inside the app: **Email → six-digit code → new password → sign in**. This works for Patient, Staff, and Administrator accounts, including an owner-created administrator that has no password yet. The email contains the code and expiry instructions, with no reset link. Email verification from Account remains a separate feature.

The app screens and server implementation are included. **Live delivery is not deployed or configured yet.** The project owner chose Resend and will configure the sender and secrets. Existing passwords, roles, profiles, and the live Firestore rules were not changed by this update.

## Owner setup, item by item

1. **Prepare a Resend sender.** Verify a domain/address in [Resend](https://resend.com/docs/dashboard/domains/introduction) and create an API key permitted to send from it. Keep the key private.

2. **Check Firebase billing.** Deploying Cloud Functions requires the [Blaze plan](https://firebase.google.com/docs/functions/get-started). If the project is still on Spark, the owner must choose whether to enable billing. This update does not enable billing or deploy paid services.

3. **Install the server dependencies**, from the project root:

   ```powershell
   npm install --prefix functions
   npm --prefix functions run check
   ```

   During preparation, npm HTTPS failed with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. The certificate issuer was the network's Fortinet gateway. The existing Windows and Git trust stores did not resolve it. Use a trusted network or ask the network administrator to repair the certificate chain/trust configuration, then retry installation. Do not disable TLS verification. This prevented installing/loading the Functions SDK locally; the reset service itself was exercised with the already installed Firebase Admin SDK and local Auth/Firestore emulators.

4. **Configure the verified sender**, in a new server-only `functions/.env` file:

   ```dotenv
   RESET_EMAIL_FROM=CareQueue <security@your-verified-domain.example>
   ```

   Use your actual verified address. The template is `functions/.env.example`. Leave the app's existing root `.env` unchanged.

5. **Set the two server secrets.** These commands use Firebase Secret Manager; do not add the secrets to an `EXPO_PUBLIC_` variable or send them in chat.

   ```powershell
   npx firebase functions:secrets:set RESET_RESEND_API_KEY --project carequeue-db90e
   ```

   Paste the Resend API key into the CLI's private prompt. Generate and store an independent random code secret without printing it:

   ```powershell
   node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))" | npx firebase functions:secrets:set RESET_CODE_SECRET --data-file - --project carequeue-db90e
   ```

6. **Deploy the account backend**, once dependencies, billing, sender, and secrets are ready:

   ```powershell
   npx firebase deploy --only "functions:accounts" --project carequeue-db90e
   ```

   The `accounts` codebase deploys `requestPasswordResetCode`, `deliverPasswordResetCode`, and `verifyPasswordResetCode` in `asia-south1`. The mobile client uses the same project and region automatically. No reset URL needs to be pasted into the app. The function runtime identity must be allowed to administer Firebase Authentication and read/write the private Firestore reset records.

7. **Check a real inbox.** Open the appropriate sign-in portal → Forgot password, enter your own registered email, enter the emailed code, and choose a new password. Confirm the new password signs in, the old password fails, and the account keeps its original role. Live inbox delivery has not been tested in this session.

## Server behaviour

- The public request only writes a private encrypted delivery job. Account lookup and Resend delivery run in a Firestore background function, so account existence does not change the public request's lookup/delivery work.
- Codes are generated with a cryptographic random generator, expire ten minutes after the request, and allow five verification attempts. Verifying a code consumes it atomically; concurrent/repeated uses fail. Resend requires a sixty-second cooldown, replaces the previous challenge, and is limited per recipient and requester address.
- Missing and disabled accounts receive the same public challenge format without receiving a reset email. Verification errors are generic. Delivery failures are logged without email addresses, codes, passwords, or provider response bodies; the UI never claims that an account exists.
- Firestore stores keyed hashes of recipient/IP identifiers and code digests. Queued recipient/code data and the internal Firebase action token are encrypted. Queue data is cleared after processing and the action token is cleared when a code is verified. Clients, including administrators, cannot read or write these records under the existing default-deny rules.
- After email-code verification, the app holds the internal one-time Firebase action token only in component memory. Firebase's password-reset API enforces its password policy and changes the password. The app also requires at least eight characters and confirmation. Custom roles and profile documents are preserved.
- Resend receives an idempotency key per challenge. Repeated processed delivery events do not resend an email. Expired/superseded queued jobs are discarded.
- Enable Firestore TTL on `deleteAfter` for `_passwordResetChallenges`, `_passwordResetRecipients`, and `_passwordResetRateLimits` to remove old private records after approximately a day. Code expiry is enforced by the service even before TTL cleanup. The default codebase does not add a scheduled cleanup service.

## Verification

`npm run check` covers app types/lint and the source/unit tests. The reset tests cover encrypted queued data, background processing, hashing, expiry, attempts, cooldown, request limits, superseded/replayed codes, missing/disabled accounts, mail failures, and a code-only Resend email body.

`npm run test:reset` runs the actual reset service against local Firebase Authentication and Firestore. It captures email in memory, changes real emulator passwords for all three roles, rejects old passwords and replayed actions, preserves claims/profiles, verifies private-record denial, and signs each account out. It creates no production users and sends no real email. Java must be configured for the Firestore emulator.

The deployment wrapper's syntax was checked. Its SDK installation, actual Cloud Functions deployment, real inbox delivery, and physical-phone/browser visual checks remain pending. The existing standalone APK predates these source changes; use Expo or rebuild it.
