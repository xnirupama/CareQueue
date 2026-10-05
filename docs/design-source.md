# Design source

The implementation uses the current CareQueue Figma file `OFZrBvawq6lmk96sHEhO88`, inspected on 5 October 2026:

- Hi-Fi Patient, page `5:10`: 32 screens.
- Hi-Fi Staff, page `5:11`: 23 screens.
- Hi-Fi Admin, page `5:12`: 19 screens.
- Requirements, wireframes, and the earlier reference chat informed the workflow.

Reference chat: `codex://threads/01a0baf1-57f8-73f1-8fb6-2a8a4ad087b8` (Create CareQueue Assignment 2).

`design/context/` contains the original high-fidelity design-to-code responses. `scripts/import-design.mjs` converts them to the declarative native screen graph in `src/data/screens.json`. React Native views, text, pressable controls, editable fields, scroll areas and original images render this graph. Entire screen screenshots are not used as app screens.

The default dimensions are 375 × 844. Mobile layouts scale to the device width and respect safe areas. The desktop preview adds an external role selector. Long-press the upper left header area on mobile to open account and demo role controls.

`assets/figma/` holds 347 original locally downloaded assets. `design/assets.json` is source provenance only; its old download URLs are never used at runtime. Original SVG masks, gradients, charts, avatars, icon slots, Inter typography, and the supplied Sinhala Abhaya Libre font are retained. Static sample dates and statistics match the design in demo mode. Values that depend on confirmed actions update as the queue changes.

Prototype links are mapped by original node IDs. Admin conditionals use the real incident verification and publication state. Mutations occur only at confirmation boundaries, so returning to a success screen does not repeat registration or publication. The active designs have changed since the Assignment 2 report; the current high-fidelity pages take precedence over older screenshots.

The language selection states match the supplied Sinhala/Tamil frames. This version does not claim a complete translation of every patient, staff and admin screen.
