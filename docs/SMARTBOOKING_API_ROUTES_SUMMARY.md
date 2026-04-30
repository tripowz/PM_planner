# SmartBooking API Routes Summary

Generated: 2026-04-30
Source: $api

## Route files and route counts

| File | Route lines |
|---|---:|
| $(@{File=routes\api.php; Routes=26}.File) | 26 |
| $(@{File=routes\api\admin.php; Routes=167}.File) | 167 |
| $(@{File=routes\api\booking_engine.php; Routes=39}.File) | 39 |
| $(@{File=routes\api\common.php; Routes=22}.File) | 22 |
| $(@{File=routes\api\driver.php; Routes=25}.File) | 25 |
| $(@{File=routes\api\guide.php; Routes=16}.File) | 16 |
| $(@{File=routes\api\hotelier.php; Routes=240}.File) | 240 |
| $(@{File=routes\api\mobile.php; Routes=14}.File) | 14 |
| $(@{File=routes\api\tour_operator.php; Routes=42}.File) | 42 |
| $(@{File=routes\api\webhooks.php; Routes=3}.File) | 3 |
| $(@{File=routes\channels.php; Routes=1}.File) | 1 |
| $(@{File=routes\console.php; Routes=0}.File) | 0 |
| $(@{File=routes\web.php; Routes=50}.File) | 50 |

## Main route groups

### Auth and registration

- POST /auth/app - app token auth.
- POST /auth/user/login - user login.
- POST /auth/user/login/verify - login code verification.
- POST /auth/user/login/resend-code - resend code.
- POST /auth/user/refresh-token - refresh token.
- POST /auth/user/logout - logout.
- POST /auth/user/create-password - set/create password.
- POST /register-request - hotelier registration request.
- Email/phone verification and password reset routes under /auth.

### External push reservations and integrations

- POST callback - HotelRunner/HR endpoint.
- POST|PUT property/push-reservation/expedia - Expedia push reservation.
- POST|PUT property/push-reservation - Ostrovok push reservation.
- POST|PUT property/push-reservation/bronevik - Bronevik push reservation.
- /mybooking/rate - MyBooking rate create/update.
- /webhook and /webhook/montra - channel status/payment gateway webhooks.

### Common dictionary routes

Under /common: countries, cities, property types, service groups, services, facilities, room names, beds, sources, document types, languages, channels, user avatar, admin chat.

### Hotelier/property routes

Under /hotelier and /hotelier/{property}:

- profile, password/email/avatar;
- properties CRUD;
- permissions, roles, property users;
- property translations, services, languages, gallery/images;
- buildings, rooms, room types;
- room type inventory, prices, hour prices, occupancy, calendar;
- bulk update, bulk min/max stay, open/close, closed on arrival/departure;
- channels connect/disconnect/import/mapping/instructions;
- sources, travel agencies, companies/company ranges;
- rates, promo codes, discounts;
- bookings/reservations create/update/cancel/no-show/confirm/print/import;
- reservation rooms move/assign/auto-assign/un-sign/delete/split/edit-price;
- holds/service holds/block holds;
- reservation and guest notes;
- guests, guest history;
- payment types, products, charges, reservation transactions/allocation;
- housekeepers, room inspections, Telegram token/chats/housekeepers;
- calendar, dashboard, reports;
- AI agent chat/history/tools/feedback/conversations;
- hotel requests.

### Booking engine public routes

Under /booking-engine/v1:

- site-data, site-configuration;
- SEO index/store/generate;
- property show/site-token/search/reservation/create/available;
- reservation update/cancel via reservation token;
- property review/contact;
- promo code validate;
- guest register/login/logout/profile/update/cancel booking;
- payment create/status/success/fail/reservation.

### Mobile routes

Mobile routes expose property list/show/permissions, FCM token update, dashboard, reservations, reservation rooms, yearly/group statistics, sources, compare properties.

### Admin/legacy routes

Admin routes include users, overview, reservations, admins, drivers, guides, tour operators, hoteliers, applications, dictionaries, comments, chats, properties, booking engine SEO/widgets, API client logs. Driver/guide/tour operator route files exist and should be treated as legacy risk unless PM confirms active use.

## AI impact rule

If a feature touches any hotelier booking, price, tax, payment, channel, booking engine, Telegram, or AI route, build an impact map before writing implementation requirements.
