# SmartBooking Frontend Routes Summary

Generated: 2026-04-30
Sources: $web, $mobile, $siteGen, $hotelSite

## Angular hotelier cabinet

Main layout routes:

- dashboard;
- ai-assistant;
- account-balance;
- breakfast;
- calendar;
- matrix/chess;
- distributors;
- guests;
- housekeeping;
- profile;
- reports;
- reservation-detail/:reservation-id;
- reservation-form;
- reservation-import;
- reservation-list;
- settings;
- website;
- transactions;
- contractor-import/:contractor-id.

Distributors routes:

- channels;
- travel-agencies;
- counterparties/contragents;
- tour-companies;
- sources/default sources;
- booking-engine;
- aggregators;
- rates/rate settings;
- tax-and-fees.

Settings routes:

- general;
- products/products-and-services;
- tax-and-fees;
- payment-type;
- currencies;
- roles;
- user-management;
- history-actions;
- notifications.

Website routes:

- gallery;
- content;
- customize;
- booking-engine;
- seo;
- analytics;
- domain;
- promo-codes;
- marketing;
- payment.

Reports routes:

- channels/channel statistics;
- statistic/reservation statistics;
- statistic-by-source;
- statistic-cancellation/status statistics.

Routing files:

- `src\app\modules\hotel\layouts\layouts-routing.module.ts`
- `src\app\modules\hotel\layouts\distributors\distributors-routing.module.ts`
- `src\app\modules\hotel\layouts\distributors\channels\channels-routing.module.ts`
- `src\app\modules\hotel\layouts\guests\guests-routing.module.ts`
- `src\app\modules\hotel\layouts\reports\reports-routing.module.ts`
- `src\app\modules\hotel\layouts\reservation-form\reservation-form-routing.module.ts`
- `src\app\modules\hotel\layouts\settings\settings-routing.module.ts`
- `src\app\modules\hotel\layouts\settings\general\general-routing.module.ts`
- `src\app\modules\hotel\layouts\settings\general\gallery\gallery-routing.module.ts`
- `src\app\modules\hotel\layouts\settings\general\general-params\general-params-routing.module.ts`
- `src\app\modules\hotel\layouts\settings\general\languages\languages-routing.module.ts`
- `src\app\modules\hotel\layouts\settings\general\regulations\regulations-routing.module.ts`
- `src\app\modules\hotel\layouts\settings\general\room-types\room-types-routing.module.ts`
- `src\app\modules\hotel\layouts\settings\general\services\services-routing.module.ts`
- `src\app\modules\hotel\layouts\settings\history-actions\history-actions-routing.module.ts`
- `src\app\modules\hotel\layouts\settings\users-management\roles\roles-routing.module.ts`
- `src\app\modules\hotel\layouts\website\website-routing.module.ts`
- `src\app\modules\hotel\layouts\website\analytics\analytics-routing.module.ts`
- `src\app\modules\hotel\layouts\website\booking-engine\booking-engine-routing.module.ts`
- `src\app\modules\hotel\layouts\website\content\content-routing.module.ts`
- `src\app\modules\hotel\layouts\website\customize\customize-routing.module.ts`
- `src\app\modules\hotel\layouts\website\domain\domain-routing.module.ts`
- `src\app\modules\hotel\layouts\website\gallery\gallery-routing.module.ts`
- `src\app\modules\hotel\layouts\website\marketing\marketing-routing.module.ts`
- `src\app\modules\hotel\layouts\website\payment\payment-routing.module.ts`
- `src\app\modules\hotel\layouts\website\promo-codes\promo-codes-routing.module.ts`
- `src\app\modules\hotel\layouts\website\seo\seo-routing.module.ts`

## React Native mobile app

Private screens:

AddedRoomsScreen.jsx, AIChatScreen.jsx, ArrivalsScreen.jsx, BookingConfirmationScreen.jsx, BookingDetailScreen.jsx, BookingProcessLoadingScreen.jsx, BookingSearchLoadingScreen.jsx, BookingsScreen.jsx, BookingSuccessScreen.jsx, CalendarScreen.jsx, ComparisonScreen.jsx, CountrySelectionScreen.jsx, CreateBookingScreen.jsx, DashboardScreen.jsx, EditPricesScreen.jsx, GuestDataScreen.jsx, GuestDetailsEditScreen.jsx, index.js, MountingAwaiterScreen.jsx, NotesEditScreen.jsx, ResDetailsScreen.jsx, ReservationScreen.jsx, RoomSelectionScreen.jsx, SettingsScreen.jsx, StatsScreen.jsx, TabNavigator.jsx

Public/auth screens:

AuthLoadingScreen.jsx, index.js, LoginScreen.jsx, NoFoundScreen.jsx, PassRestoreScreen.jsx, RestoreScreen.jsx, SignUpScreen.jsx, TermsScreen.jsx, VerificationScreen.jsx, VersionProvider.jsx

Mobile bottom tabs observed:

- Dashboard;
- Reservations / bookings;
- Statistics;
- More/settings;
- AI mini chat button/sheet.

## Website/template repos

- Site generator repo has Nx apps: constructor, garden, template-modern, template-universal, template-monolith, ui-kit-demo.
- Hotel website repo has Nx apps: garden, garden-e2e.
- Treat source of truth for website content/config as unknown unless confirmed. API booking engine routes and web cabinet Website section both participate.

## AI UX rule

If a feature changes backend behavior visible to hotel staff or guests, verify web cabinet, mobile app, booking engine/site, and Telegram UX separately. Do not assume one frontend covers all roles.
