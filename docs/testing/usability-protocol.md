# Working-app usability test protocol

Recruit at least five consenting real or role-informed proxy participants: two patients (one less digitally confident), one caregiver, one staff representative, and one administrator. Record actual roles and proxy status; this allocation is a recruitment plan, not an assertion of participation.

Use fictional records. Pilot the tasks on the exact installed build. Record app version/build hash, phone/OS, mode (demo/cloud), date, moderator, consent reference and relevant recording access. Keep identifying consent documents outside the public repository. Explain any recording visibility before asking for recording consent. Participation is voluntary; a participant can stop at any time.

Moderator introduction: We are testing the CareQueue app, not you. Please tell us what you are looking for and what you expect to happen. Use the fictional visit details. You may pause or stop at any time. We will distinguish working app updates from services that are not connected.

Read one goal at a time without naming a button. Start timing after the participant understands the goal. Record wrong turns and substantive help. Stop on abandonment, consequential incorrect action, or a pilot-agreed time limit. Mark an app defect that prevents execution as blocked rather than blaming the participant. After each task ask for ease on a 1–5 scale, where 1 is very difficult and 5 very easy.

| Task | Eligible users | Goal and success criterion |
| --- | --- | --- |
| T01 | patient/caregiver | Prepare for an OPD visit. Identify the document guidance and counter/room; recognize that the route needs site confirmation. |
| T02 | patient/caregiver | Find the issued token, current serving token, people ahead, estimated range and last update; explain that priority can change the order. |
| T03 | patient/caregiver | Save alert preferences. Respond to approaching/called states correctly; do not equate approaching with called. Record disconnected SMS/background channels as blocked for delivery. |
| T04 | patient/admin | Publish/read a delay or unavailable status and return to the queue without losing it; correctly interpret a cancelled visit. |
| T05 | patient/caregiver | Save a named caregiver consent, read it back, revoke it. Test actual recipient access separately; record unavailable delivery as blocked. |
| T06 | staff | Register a fictional patient, read the issued token, select/edit only that record, link it to a test patient account and update its state. |
| T07 | staff | Select a waiting token, record a clinician-reviewed reason, review/confirm priority. A patient must be denied. |
| T08 | patient/staff | Mark a called visit missed, request recovery, recognize pending review; staff approves/rejects and patient observes the result. |
| T09 | admin | Find current-session flow, measured wait, missed/cancelled counts and delay-update count, export a report and explain its scope. |
| T10 | admin/staff | Verify the incident, review a message, publish once, read the shared service result, withdraw as admin. Identify unavailable external delivery. |
| T11 | staff | Disconnect, save a device-local manual note, restart, reconnect, check against live records and reconcile only after review; do not duplicate a confirmed action. |
| T12 | all | Use large text and token display/assistance route; distinguish private record data from public tokens and verify role restrictions. |

Re-test changes that address high-severity problems. Link each issue to participant/task evidence, a timestamp where available, the fix/commit and a retest. Keep unresolved issues visible.

Analysis: independent successes / eligible attempts, showing numerator and denominator. List helped, unsuccessful and blocked attempts separately. Report median time for completed attempts and state exclusions. Report median/range of task ease only where a response exists. Do not substitute developer tests for participant results.
