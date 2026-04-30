# SmartBooking Bot Events Summary

Generated: 2026-04-30
Source: $bot

## Bot/API routes

Telegram service exposes:

- POST /api/telegram/webhook/housekeeper;
- POST /api/telegram/webhook/property;
- POST /api/telegram/webhook/booking-engine.

Property token management API under /api/property with API token auth:

- create property;
- create property simple;
- get token;
- get property info by token;
- list/update chats;
- list/create housekeepers;
- update housekeeper token;
- toggle housekeeper status.

## Rabbit/router mechanics

- RabbitRouter maps topic strings to handlers via egisterHandler(topic, handler).
- If no handler is registered for a topic, it logs a warning.
- Exact handler registration location should be confirmed in code before changing routing keys.

## Handler classes

BookingNotificationHandler.php, BookingReportReadyHandler.php, BookingUpdateHandler.php, BreakfastReportReadyHandler.php, DailyCleaningHandler.php, DailyCleaningNotesHandler.php, DailyCleaningUnassignedHandler.php, HouseKeeperCreatedHandler.php, HousekeepingReportReadyHandler.php, PropertyImportHandler.php, ReservationCreatedHandler.php, ReservationDeletedHandler.php, ReservationUpdatedHandler.php, RoomReportReadyHandler.php

## Message topic names found in message classes

- `return 'telegram.booking.notification'`
- `return 'telegram.report.pdf.bookings'`
- `return 'telegram.report.pdf.breakfast'`
- `return 'telegram.daily-cleaning.status'`
- `return 'telegram.housekeeper.status'`
- `return 'telegram.report.pdf.housekeeping'`
- `return 'telegram.daily-cleaning.created'`
- `return 'telegram.property.import.result'`
- `return 'telegram.report.pdf.rooms'`

## Functional event groups

### Booking/reservation notifications

Handlers cover booking/reservation created, updated, deleted, and generic booking notification. The update docs mention route 	elegram.booking.updated and old/new booking data diff handling.

Expected impact checks:

- property_id must match active chats;
- individual and group chats may both receive messages;
- status cancellation has special messaging;
- date, room, guest, room type, total amount, status changes are diffed;
- debt/amount due indicators may be included.

### Reports ready

Handlers exist for:

- booking report ready;
- breakfast report ready;
- housekeeping report ready;
- room report ready.

Expected payload includes property id, PDF URL, optional filename. Messages are sent to active property chats.

### Housekeeping/daily cleaning

Handlers exist for:

- daily cleaning assigned/created;
- notes added/deleted;
- unassigned task;
- housekeeper created.

Expected impact checks:

- housekeeper token;
- room/date/condition/do-not-disturb/notes;
- active housekeeper chat;
- task status and front desk verification;
- effect of room move or reservation date change.

### Property import and token lifecycle

Property import handler supports import types including full import, property users update, property update, and property user deactivation. Token docs describe /auth [token], RU/UZ language choice, one active token/chat behavior, and deactivation of old chats during token rotation.

## AI rule

Any feature touching reservations, housekeeping, reports, property users, Telegram token, or notifications must define whether Telegram events are created/updated, payload contract, delivery failure behavior, and chat permission behavior.
