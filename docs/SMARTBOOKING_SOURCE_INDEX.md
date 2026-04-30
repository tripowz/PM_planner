# SmartBooking Source Index

Generated: 2026-04-30

Purpose: keep PM Planner light while giving AI stable pointers to the real codebase. Do not copy full source trees into PM Planner. D:\Smart remains the source of truth; D:\PM_planner\docs stores curated knowledge for PM/spec review.

## Source of truth repositories

| Area | Path | Purpose | AI should use for |
|---|---|---|---|
| Core API | $api | Laravel backend, DB, business rules | API, DB, reservations, pricing, finance, channels, booking engine |
| Web cabinet | $web | Angular hotelier cabinet | Web screens, navigation, permissions UX |
| Mobile app | $mobile | React Native app | Mobile screens, AI chat, dashboard/reservations/statistics |
| Telegram bot | $bot | Telegram bridge/service | Bot events, Telegram auth, housekeeping notifications |
| Site generator | $siteGen | Nx/React templates and constructor | Website templates, generated hotel sites |
| Hotel website | $hotelSite | Nx/React hotel website frontend | Public website frontend/template |
| Tour layout | $smart\smartbooking-uz-smartbooking-tour-layout-771b713cf984 | Static layout/dist | Legacy/static marketing layout |

## Knowledge pack files in this folder

| File | Use |
|---|---|
| PM_SYSTEM_INPUT_SMARTBOOKING.md | Main PM/AI standard for specs and review |
| AI_TZ_REVIEW_INSTRUCTIONS.md | Short instruction for AI tools |
| SMARTBOOKING_SOURCE_INDEX.md | Repo/source map |
| SMARTBOOKING_API_ROUTES_SUMMARY.md | API route groups and important endpoints |
| SMARTBOOKING_DB_ENTITIES_SUMMARY.md | DB/domain entity map |
| SMARTBOOKING_FRONTEND_ROUTES_SUMMARY.md | Web/mobile navigation map |
| SMARTBOOKING_BOT_EVENTS_SUMMARY.md | Telegram/RabbitMQ/bot event map |

## Rule for AI

When reviewing a feature, use this order:

1. Read PM_SYSTEM_INPUT_SMARTBOOKING.md.
2. Read the relevant summary file(s).
3. If exact behavior is still unclear, inspect the source path listed above.
4. Mark every non-verified statement as Assumption or Unknown.
