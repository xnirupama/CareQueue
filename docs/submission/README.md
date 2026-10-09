# Milestone 03 submission checklist

Deadline in the supplied Assignment 3 brief: **9 October 2026** (time not specified).

## Required deliverables

- Consolidated Milestones 01–03 report, maximum 35 main pages including the cover. References and appendices are excluded.
- Filename: `IT3060HCI2026_Milestone03_GroupWE_79.pdf`.
- Four members: IDs, names, confirmed individual interface contributions.
- Executive summary; M01 research/requirements; M02 design progression; stack justification; architecture; implementation screenshots; requirement → prototype → implementation → test matrix; functional tests/results; usability plan/execution/results; issues/fixes; overall Gantt; conclusions/lessons; references; evidence appendix.
- Version-controlled source repository URL, setup/build instructions, installable APK where applicable.
- Each member demonstrates and explains their own implemented interfaces, stack choices and testing results.
- At least two working CRUD operations per assigned interface. A navigation transition is not CRUD; a read-only screen does not demonstrate two operations. Confirm interface grouping/ownership with the coordinator where the original interface is informational.
- At least five real/proxy participants test the **working app**. Prototype recordings or earlier discovery interviews alone do not establish this.

## What has been prepared here

- Current app: existing 74 design screens plus account, scanner, operational management and token display. The 8 October extension adds dedicated login/registration/password reset and three illustrated welcome screens; reconcile these additions with the final report and interface allocation.
- Queue corrections, editable registration details, missed/completed/cancelled visits, explicit recovery decisions, service availability, withdrawable broadcasts, session metrics, printing and manual-note review.
- Source-based workflow/account-validation tests and test plan with pending device/multi-account results. Account services passed Auth emulator and temporary live Firebase tests; see `docs/testing/accounts.md`.
- Report review draft and editable content in `docs/submission/report-content.json`.
- Requirement and interface coverage register in `docs/submission/traceability.json`.
- Five participant session templates and an analysis script. Templates are not completed sessions.

## Evidence still needed from the group

1. Confirm actual member contributions; M01 lists research roles and M02 lists proposed implementation roles only.
2. Conduct/provide five working-app session records with consent, app version, tasks/outcomes, times, ease ratings and recording links when consented.
3. Install and verify the APK on a phone, including camera permissions, font expansion, native PDF/printing and offline restart.
4. Exercise live patient/staff/admin accounts; owner must assign claims and initialize General OPD. Do not place admin credentials in the app.
5. Publish the reviewed local changes to https://github.com/xnirupama/CareQueue and supply the build artifact link; check assessor access.
6. Resolve remaining channels: SMS/background delivery. Caregiver account sharing is now implemented and rule-tested; its new rules and live multi-account flow still need rollout/verification. Consent-only saves do not deliver messages. Full translations, historic reports and site-confirmed directions also need evidence or explicitly agreed scope.
7. Check the CRUD coverage register with confirmed assignments. Do not claim every one of the 74 state screens has two CRUD operations.
8. Members review and rewrite the draft in their own words, verify cited research evidence and prepare individual viva explanations. The brief permits AI assistance and requires less than 50% AI content; no detector outcome is claimed.

## Evidence handling

M01 describes ten supplied proxy records and explicitly says authenticity/consent need verification. Treat counts as a small discovery dataset, not population results. M02's body says five sessions are pending, while Appendix B lists recording links. These are inconsistent and have not been treated as M03 results. Original staff background-rectangle IDs were superseded by actual frames in the current file; record that deviation rather than silently using obsolete IDs.

Run `python scripts/analyze-usability.py docs/testing/usability-results.json` after entering actual anonymized observations. Rebuild the report with the documented report command after reviewing/updating its content.


## Review archive

`output/CareQueue_Milestone03_review-package.zip` packages the source, public sample config, documentation, testing instruments and review PDF. It excludes credentials, local `.env`, dependency caches and generated native projects. Rebuild after edits with `python scripts/package-submission.py`. This archive is for review; it does not replace publishing reviewed source to the repository or providing a tested APK.


The final preview APK is `artifacts/CareQueue-preview.apk`. Package/signature verification passed; ARM64, min API 24. The APK and source/report archive are separate review artefacts. Record actual installation/device results before marking that gate complete. Earlier native build failures were addressed; no phone testing result has been manufactured.
