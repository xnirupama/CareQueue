# CareQueue role portraits

Three fictional adult portraits generated with the built-in image generation tool on 18 October 2026. They illustrate Patient, Hospital staff, and Administrator entry points; they are not account profile pictures or photographs of real CareQueue users.

- `patient.jpg`: patient in a sage casual blouse.
- `staff.jpg`: nurse in blue scrubs.
- `admin.jpg`: hospital administrator in business clothing.

All three are bundled locally through static image imports in `src/components/RoleIdentity.tsx`. The 384 × 384 JPEGs retain the full square composition and use compression for mobile loading. Full-size generated PNGs are in `output/imagegen/role-portraits/`; original tool outputs are retained in the image generation output directory. The exact prompt set is in [prompts.json](prompts.json).

These portraits appear in the sign-in chooser, corresponding sign-in forms, and Patient/Staff registration choices. Authentication and role permissions are independent of the displayed portraits.
