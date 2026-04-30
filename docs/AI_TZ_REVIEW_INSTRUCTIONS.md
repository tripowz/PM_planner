# AI TZ Review Instructions

Before creating or reviewing any SmartBooking product requirements, read:

1. docs/PM_SYSTEM_INPUT_SMARTBOOKING.md
2. docs/SMARTBOOKING_SOURCE_INDEX.md

Then read the relevant summary files:

- docs/SMARTBOOKING_API_ROUTES_SUMMARY.md
- docs/SMARTBOOKING_DB_ENTITIES_SUMMARY.md
- docs/SMARTBOOKING_FRONTEND_ROUTES_SUMMARY.md
- docs/SMARTBOOKING_BOT_EVENTS_SUMMARY.md

Use these files as the source of truth for:

- product modules and repository boundaries;
- impact analysis;
- permissions;
- data contracts;
- events and integrations;
- edge cases;
- release and regression risks;
- evidence, unknowns, assumptions, and decision logs.

For every feature spec, return:

- Verdict: Ready / Not Ready
- Impact map
- Evidence
- Unknowns & assumptions
- Missing requirements
- Required API/data/event changes
- Required tests
- Release risks

If exact behavior is not confirmed by these docs, mark it as Unknown or inspect the source path listed in SMARTBOOKING_SOURCE_INDEX.md.
