# SmartBooking: пакет информации для PM-системы и AI-аудита ТЗ

Дата подготовки: 2026-04-30  
Источник: локальная кодовая база `D:\Smart`

## 1. Назначение документа

Этот документ можно вставить в PM-систему как базовый контекст продукта SmartBooking. Его цель:

- описать текущий продукт и его подсистемы;
- дать структуру для создания ТЗ;
- показать текущие риски, неясности и места, где ИИ должен задавать уточняющие вопросы;
- отделить подтвержденные факты из кода от предположений.

## 2. Краткое описание продукта

SmartBooking - платформа для управления гостиницей и бронированиями. По коду система включает:

- PMS/Hotelier cabinet для сотрудников отеля;
- channel manager для подключений к внешним каналам продаж;
- booking engine и сайт отеля для прямых бронирований;
- мобильное приложение для отельера;
- Telegram-бот для уведомлений и housekeeping-сценариев;
- финансовые операции, платежи, начисления, налоги и сборы;
- аналитику и отчеты;
- AI-ассистента внутри hotelier/mobile продукта.

## 3. Репозитории и назначение

| Репозиторий | Назначение | Технологии/факты |
|---|---|---|
| `smartbooking-uz-smartbooking-api-65ff539ade83` | Основной backend API | Laravel 5.7, PHP 7.2, Passport, WebSockets, RabbitMQ, Redis, Sentry |
| `smartbooking-uz-smartbooking-hotel-af91a9c61dd2` | Web-кабинет отельера | Angular 9, Ng Zorro, ngx-socket-io, charts, Excel/PDF export |
| `smartbooking-uz-sb-app-2022-aed31361aa41` | Мобильное приложение отельера | React Native 0.74, Redux/Saga, Firebase, bottom tabs |
| `smartbooking-uz-smart-bot-2c1a5e836c5f` | Telegram-бот и bridge-сервис | Laravel 12 template, PHP 8.4 in README, RabbitMQ listener, Telegram polling |
| `smartbooking-uz-site-generator-f913660dd7c5` | Генератор/конструктор сайтов отеля | Nx monorepo, React 19, Vite, Tailwind, template apps |
| `smartbooking-uz-smartbooking-hotel-website-7d45f089bafc` | Hotel website frontend/template | Nx monorepo, React 19 |
| `smartbooking-uz-smartbooking-tour-layout-771b713cf984` | Статический tour-layout/лендинг | Готовый `dist`, HTML/CSS/JS |

## 4. Пользовательские роли

Подтверждено кодом:

- `hotelier` - основной пользователь web/mobile кабинета отеля.
- Сотрудник отеля/property user - доступ к конкретному объекту через роли и permissions.
- Администратор/суперадмин - административные маршруты есть в API.
- Гость - booking engine guest auth: регистрация, вход, профиль, отмена брони.
- Housekeeper - отдельная сущность для уборок и Telegram-сценариев.
- Внешние каналы/партнеры - Booking.com, Expedia, Ostrovok, Bronevik, HotelRunner/HR, MyBooking.

Нужно уточнить в ТЗ:

- список бизнес-ролей в терминах компании;
- какие роли должны видеть web, mobile, Telegram и booking engine;
- матрицу прав по модулям.

## 5. Основные продуктовые модули

### 5.1. Авторизация и аккаунты

Функции:

- app-token авторизация;
- login по пользователю;
- подтверждение login-кода;
- refresh token/logout;
- создание пароля;
- подтверждение email и телефона;
- сброс пароля по email/phone;
- профиль пользователя, смена email/password/avatar.

AI должен проверить:

- есть ли единая модель auth для web, mobile, guest и bot;
- где включена 2FA/OTP и какие сроки жизни кодов;
- как обрабатываются refresh token, logout, device tokens и FCM.

### 5.2. Управление объектом размещения

Функции:

- создание/редактирование/скрытие property;
- основные данные отеля, языки, сервисы, изображения, логотип;
- buildings, rooms, room types, beds/facilities/services;
- переводы и временные переводы;
- статус/шаг заполнения объекта.

Ключевые сущности:

- `properties`, `property_translations`, `property_data`;
- `buildings`, `rooms`, `room_types`, `room_names`;
- `images`, `image_names`, `services`, `facilities`, `languages`.

AI должен проверить:

- обязательные поля для запуска продаж;
- статусы property и условия публикации;
- что происходит с данными при удалении/деактивации объекта.

### 5.3. Номера, цены и доступность

Функции:

- room type inventory;
- цены по датам;
- часовые цены;
- min stay, max stay;
- closed on arrival/departure;
- bulk update цен и доступности;
- occupancy rules;
- calendar by channel;
- company prices/ranges.

Ключевые сущности:

- `room_type_inventory`;
- `room_type_prices`;
- `room_type_hour_prices`;
- `room_type_occupancy`;
- `company_ranges`, `company_range_prices`.

AI должен проверить:

- конфликт правил: min/max stay, closed on arrival/departure, occupancy, channel mapping;
- приоритет ручных цен, корпоративных тарифов, channel rates и discounts;
- timezone и границы дат.

### 5.4. Бронирования

Функции:

- список, создание, просмотр, печать;
- импорт бронирований;
- подтверждение, отмена, no-show;
- move/assign/unassign room;
- auto assign rooms;
- split reservation room/split group;
- редактирование цены reservation room;
- гости в бронировании;
- notes по бронированию и гостю;
- check-in/check-out/mass arrived/mass left;
- блокировки/holds/service holds/block holds;
- токены бронирований для booking engine.

Ключевые сущности:

- `reservations`, `reservation_rooms`, `reservation_guests`;
- `reservation_room_prices`, `reservation_room_price_details`;
- `reservation_notes`, `guest_notes`;
- `holds`, `split_groups`, `block_update_reservation_fields`;
- `reservation_logs`.

AI должен проверить:

- все статусы бронирования и переходы между ними;
- правила cancel/no-show/confirm;
- влияние move/split на цены, налоги, платежи и housekeeping;
- идемпотентность external channel push reservation.

### 5.5. Гости

Функции:

- CRUD гостей;
- история гостя;
- документы/страны/регионы;
- guest notes;
- guest auth в booking engine;
- профиль гостя;
- отмена брони гостем.

Ключевые сущности:

- `guests`;
- `guest_reservation`;
- `guest_personal_access_tokens`;
- `document_types`.

AI должен проверить:

- PII/персональные данные и правила хранения;
- доступ сотрудников к карточным/паспортным данным;
- дубли гостей и merge-сценарии.

### 5.6. Финансы, платежи, начисления

Функции:

- payment types;
- charges;
- reservation transactions;
- folio;
- allocation;
- balance по reservation/reservation room;
- cash drawers и reports в миграциях, часть API закомментирована;
- online payments;
- Montra payment link;
- currency convert/recalculate reservation currency.

Ключевые сущности:

- `payments`, `payment_types`, `charges`;
- `reservation_transactions`, `reservation_transaction_products`, `reservation_transaction_allocations`;
- `folios`;
- `online_payments`;
- `currencies`, `currency_names`.

AI должен проверить:

- double-entry/ledger logic или текущую модель начислений;
- что считается оплатой, списанием, возвратом и allocation;
- влияние валюты и курса на старые бронирования;
- аудит платежных операций.

### 5.7. Налоги, сборы, скидки и промокоды

Функции:

- tax and fees CRUD;
- версии налогов/сборов;
- привязка налогов к источникам, компаниям, каналам;
- promo codes в booking engine;
- auto-applied discounts;
- discounts by rate/room type/combinability.

Ключевые сущности:

- `tax_and_fees`, `tax_and_fee_versions`;
- `reservation_tax_and_fees`;
- `promo_codes`, `reservation_promo_codes`;
- `discounts`, `discount_rate`, `discount_room_type`, `discount_combinable`, `reservation_discounts`.

AI должен проверить:

- порядок применения tax, fee, promo code и discount;
- совместимость скидок;
- округления;
- локальные/иностранные значения налогов.

### 5.8. Каналы продаж и интеграции

Функции:

- подключение/отключение property channels;
- import channel data;
- mapping room/rate;
- import channel reservations;
- attach/detach tax and fees;
- channel instructions;
- push reservations от Expedia, Ostrovok, Bronevik, HR;
- Booking.com request logs;
- MyBooking rate endpoints.

Каналы/сервисы из кода:

- Booking.com;
- Expedia/ExpediaCom;
- Ostrovok;
- Bronevik;
- HotelRunner/HR;
- MyBooking;
- RabbitMQ.

Ключевые сущности:

- `property_channels`;
- `channels`;
- `property_channel_rooms`;
- `property_channel_room_rate`;
- `property_channel_room_occupancies`;
- `channel_templates`;
- `api_client_logs`, `api_clients`.

AI должен проверить:

- единый lifecycle подключения канала;
- conflict resolution между каналами;
- retry/logging/idempotency;
- маппинг валют, налогов, occupancy и rate plans.

### 5.9. Booking engine и сайт отеля

Функции:

- site data/configuration;
- SEO CRUD/generate;
- property public page;
- search availability;
- create/update/cancel reservation;
- guest register/login/profile/logout;
- promo code validation;
- review/contact;
- online payment create/status/success/fail;
- site token/configuration token.

Ключевые сущности:

- `property_widgets`;
- `booking_engine_sites`;
- `booking_engine_seo`;
- `property_reviews`;
- `property_contacts`;
- `reservation_token`.

Frontend:

- отдельный Nx/React site generator с apps `constructor`, `template-modern`, `template-universal`, `template-monolith`, `garden`;
- в web-кабинете есть раздел `Website`: gallery, content, customize, booking engine, SEO, analytics, domain, promo codes, marketing, payment.

AI должен проверить:

- где источник истины для контента сайта;
- как site generator синхронизируется с API;
- кто может менять домен, SEO, платежи;
- как защищен `site-configuration.token`.

### 5.10. Housekeeping и Telegram

Функции web/API:

- housekeepers CRUD;
- room inspections;
- daily cleanings;
- housekeeping module в web;
- Telegram token generate;
- Telegram chats list/activate;
- привязка housekeepers.

Функции Telegram-бота:

- webhooks: housekeeper, property, booking-engine;
- property token API: create property, get token, get property info, chats, chats status, housekeepers, create housekeeper, update housekeeper token, toggle status;
- RabbitMQ listener;
- Telegram polling для property и housekeeper;
- уведомления о reservation created/updated/deleted;
- отчеты: booking, breakfast, housekeeping, room;
- daily cleaning notifications, notes, unassigned cleanings.

Сценарии из документации бота:

- подключение отельера к боту через `/auth [token]`;
- выбор языка RU/UZ;
- групповый и личный чат;
- при смене housekeeper token старые чаты деактивируются;
- можно перепривязать конкретные чаты новым token.

AI должен проверить:

- разграничение property token и housekeeper token;
- безопасность перепривязки чатов;
- что происходит при увольнении сотрудника;
- как Telegram-команды связаны с web permissions;
- fallback при недоставке уведомлений.

### 5.11. Dashboard, аналитика и отчеты

Функции:

- dashboard summary;
- main statistics;
- group-by statistics;
- statistics for year;
- reservations by day/period;
- reservation overview: arrived, left, living, overload, confirmed, canceled, breakfast;
- room type availability;
- reports: account balance, transactions, cancellation, reservation source report.

Web-разделы:

- Dashboard;
- Reports: channel statistics, reservation statistics, source statistics, cancellation statistics.

Mobile-разделы:

- Dashboard;
- Брони;
- Статистика;
- Еще/settings;
- AI mini chat.

AI должен проверить:

- определения метрик: occupancy, ADR, RevPAR, cancellation rate, source revenue;
- фильтры по датам/каналам/источникам/валютам;
- расхождение между web и mobile отчетами.

### 5.12. AI-ассистент

Функции:

- chat;
- history;
- tools;
- feedback;
- conversations CRUD;
- token limit per property;
- domain tools: reservations, rooms, guests, finance, analytics, settings.

Ключевые сущности:

- `ai_agent_logs`;
- `ai_agent_conversations`;
- `property_data.ai_token_limit`.

AI должен проверить:

- какие действия AI может выполнять, а какие только советовать;
- логирование prompt/response/tool calls;
- лимиты токенов и billing;
- защита от доступа к данным другого property;
- роль AI в PM-системе: ревью ТЗ, поиск противоречий, генерация acceptance criteria.

## 6. Web-кабинет отельера: карта экранов

Основные lazy-loaded разделы:

- AI Assistant;
- Account Balance;
- Breakfast;
- Calendar;
- Matrix/Chess;
- Dashboard;
- Distributors;
- Guests;
- Housekeeping;
- Profile;
- Reports;
- Reservation Detail;
- Reservation Form;
- Reservation Import;
- Reservation List;
- Settings;
- Website;
- Transactions;
- Contractor Import.

Раздел `Distributors`:

- Channels;
- Travel Agencies;
- Counterparties/Contragents;
- Tour Companies;
- Default Sources;
- Booking Engine;
- Aggregators;
- Rate Settings;
- Tax and Fees.

Раздел `Settings`:

- General;
- Products and Services;
- Tax and Fees;
- Payment Types;
- Currencies;
- Roles;
- User Management;
- History Actions;
- Notifications.

Раздел `Website`:

- Gallery;
- Content;
- Customize;
- Booking Engine;
- SEO;
- Analytics;
- Domain;
- Promo Codes;
- Marketing;
- Payment Request.

## 7. Mobile app: карта экранов

Основные экраны:

- login, verification, signup, restore password, terms;
- dashboard;
- reservation list;
- create booking flow;
- room selection;
- edit prices;
- added rooms;
- guest data;
- country selection;
- booking confirmation;
- booking process loading;
- booking detail;
- guest details edit;
- notes edit;
- comparison;
- stats;
- settings;
- arrivals;
- bookings;
- AI chat/mini chat.

Bottom tabs:

- Dashboard;
- Reservations/Брони;
- Statistics;
- More/Еще;
- AI mini chat кнопка.

## 8. Основные API-группы

Публичные/общие:

- `POST /auth/app`;
- `POST /auth/user/login`;
- `POST /auth/user/login/verify`;
- `POST /auth/user/refresh-token`;
- `POST /register-request`;
- `POST|PUT /property/push-reservation/*`;
- `GET /common/*`.

Hotelier:

- `/hotelier/profile`;
- `/hotelier/properties`;
- `/hotelier/{property}/...`;
- nested property modules: rooms, room-types, bookings, guests, channels, rates, companies, products, charges, taxes, reports, ai-agent, telegram, hotel-requests.

Booking engine:

- `/booking-engine/v1/site-data`;
- `/booking-engine/v1/site-configuration`;
- `/booking-engine/v1/seo`;
- `/booking-engine/v1/property/{property}/search`;
- `/booking-engine/v1/property/{property}/create`;
- `/booking-engine/v1/property/{property}/reservation/{reservation_id}/update|cancel`;
- guest auth/profile;
- payment create/status/success/fail.

Telegram bot:

- `/api/telegram/webhook/housekeeper`;
- `/api/telegram/webhook/property`;
- `/api/telegram/webhook/booking-engine`;
- `/api/property/*` with `auth.api.token`.

## 9. События и интеграции

Подтверждено кодом/доками:

- RabbitMQ route `telegram.booking.updated`;
- Telegram notifications on booking create/update/delete;
- Telegram reports ready;
- channel push reservations from OTAs;
- Booking.com request logs;
- payment link generation;
- Firebase в mobile: analytics, crashlytics, messaging, remote config.

Нужно уточнить:

- полный список exchange/queue/routing keys RabbitMQ;
- retry policy;
- DLQ;
- SLA доставки уведомлений;
- как алерты попадают в поддержку.

## 10. Наблюдения и проблемные места для AI-аудита

1. В корне лежит несколько репозиториев без общего manifest-файла. Нужно определить, это монорепо или набор независимых сервисов.
2. Основной API использует Laravel 5.7/PHP 7.2. Это устаревший стек с рисками безопасности, совместимости и поддержки.
3. Telegram-бот описан как Laravel 12/PHP 8.4 template, что сильно отличается от основного API. Нужна архитектурная граница и контракт между API и ботом.
4. README части проектов шаблонные и не описывают реальный продукт.
5. Русская документация в Telegram repo отображается с битой кодировкой. Для PM-системы нужно восстановить UTF-8.
6. В API есть большой набор миграций до марта 2026. Это показывает активную эволюцию схемы; нужно проверять актуальность ветки, порядок применения миграций и совместимость с production DB.
7. В API есть старые туристические роли/модули: drivers, guides, tour operators. Нужно решить, они актуальны или legacy.
8. Cash drawers routes в `hotelier.php` закомментированы, но миграции/домены есть. Нужно уточнить статус модуля.
9. Есть несколько frontend-проектов для сайта отеля: web cabinet website section, site generator, hotel website repo, tour layout. Нужно определить источник истины.
10. AI-ассистент имеет domain tools и историю разговоров, но нужно зафиксировать permitted actions и audit policy.

## 11. Карта связей и impact matrix

Этот раздел нужен, чтобы AI не смотрел на задачу изолированно. Любое изменение в одном модуле нужно проверять по связям ниже.

### 11.1. Главная цепочка данных

```text
Property
  -> Buildings
  -> Rooms
  -> Room Types
  -> Inventory / Prices / Occupancy / Rates
  -> Channels / Sources / Companies / Travel Agencies
  -> Reservations
  -> Reservation Rooms
  -> Guests
  -> Taxes / Fees / Discounts / Promo Codes
  -> Reservation Transactions / Payments / Folio / Balance
  -> Reports / Dashboard / Statistics
  -> Notifications / Telegram / Mobile / WebSockets
```

### 11.2. Если меняется бронирование

AI обязан проверить влияние на:

| Что меняется | Что может быть задето |
|---|---|
| Даты заезда/выезда | availability, inventory, prices, min/max stay, closed dates, housekeeping, Telegram, reports |
| Номер/тип номера | room assignment, split groups, occupancy, housekeeping, room inspections, booking detail |
| Статус брони | cancellation/no-show/confirm, channel status, balance, refunds, reports, Telegram |
| Гость | guest history, guest notes, PII, booking engine guest profile, mobile booking detail |
| Цена | reservation room prices, tax/fee recalculation, discounts, promo codes, balance, reports |
| Валюта | initial currency, recalculation, payments, reports, channel payment data |
| Источник/канал | property channel mapping, source statistics, commission/tax rules, OTA sync |
| Разделение брони | reservation_rooms, split_groups, prices, transactions, folio, housekeeping |

Минимальный impact вопрос:

```text
Если мы меняем бронирование, что произойдет с доступностью, ценой, налогами, платежами, отчетами, Telegram и внешними каналами?
```

### 11.3. Если меняются цены, тарифы или доступность

AI обязан проверить влияние на:

- calendar/matrix;
- room type prices;
- room type inventory;
- occupancy;
- rates;
- company prices;
- travel agency rates;
- channel rates/mapping;
- booking engine search;
- existing reservations, если есть перерасчет;
- mobile reservation creation;
- reports.

Критичные вопросы:

- Это изменение действует только на будущие брони или пересчитывает существующие?
- Какая иерархия приоритетов: base price, rate, company price, travel agency rate, channel rate, promo code, discount?
- Нужно ли отправлять обновление во внешние каналы?
- Есть ли bulk update и rollback?

### 11.4. Если меняются налоги, сборы, скидки или промокоды

AI обязан проверить влияние на:

- booking engine price display;
- reservation create/update;
- reservation room prices;
- reservation tax and fees;
- reservation transactions;
- folio;
- balance;
- payment links;
- reports;
- channel reservations.

Критичные вопросы:

- Налог применяется к room revenue, product, service или всей брони?
- Скидка применяется до или после налогов?
- Промокод можно комбинировать со скидками?
- Версия налога фиксируется в момент создания брони или пересчитывается?
- Что происходит при отмене/возврате?

### 11.5. Если меняется платежная логика

AI обязан проверить влияние на:

- reservation balance;
- reservation room balance;
- payments;
- charges;
- reservation transactions;
- allocations;
- folio;
- online payments;
- Montra payment links;
- refunds/cancellations;
- reports/account balance;
- mobile booking detail.

Критичные вопросы:

- Это payment, charge, transaction или allocation?
- Как избежать двойного списания?
- Что логируется для аудита?
- Как связаны платеж и конкретная комната/гость/folio?
- Что происходит при неуспешном payment callback?

### 11.6. Если меняется канал продаж

AI обязан проверить влияние на:

- property channel connect/disconnect;
- room/rate mapping;
- channel templates;
- imported reservations;
- pushed reservations;
- API client logs;
- inventory/prices sync;
- taxes/fees per channel;
- currency;
- cancellation/modification from OTA;
- Telegram notifications;
- reports by channel/source.

Критичные вопросы:

- Есть ли idempotency key/channel booking id?
- Что делать при повторном webhook?
- Что делать, если канал прислал бронь на недоступные даты?
- Как решается конфликт между ручным изменением и OTA update?
- Нужно ли отправлять ответ/ack в формате канала?

### 11.7. Если меняется Telegram/housekeeping

AI обязан проверить влияние на:

- property token;
- housekeeper token;
- chats activation/deactivation;
- daily cleanings;
- room inspections;
- reservation status changes;
- RabbitMQ events;
- delivery logs;
- language RU/UZ;
- web settings/telegram screens.

Критичные вопросы:

- Кто имеет право генерировать новый token?
- Деактивируются ли старые чаты?
- Как перепривязать только нужные чаты?
- Что делать, если Telegram недоступен?
- Какие события должны уходить в личный чат, а какие в групповой?

### 11.8. Если меняется сайт отеля или booking engine

AI обязан проверить влияние на:

- property data;
- site configuration;
- site token/configuration token;
- SEO;
- gallery/content/customize/domain;
- booking engine search/create/cancel;
- guest auth/profile;
- promo codes;
- online payments;
- generated site/template repos;
- web cabinet Website section.

Критичные вопросы:

- Где источник истины: API, site generator или отдельный website repo?
- Кто публикует изменения?
- Как rollback сайта работает?
- Что видит гость до и после оплаты?
- Как защищен публичный booking flow?

### 11.9. Если меняется AI-ассистент

AI обязан проверить влияние на:

- permissions property user;
- AI tool access;
- logs;
- conversations;
- token limits;
- data isolation by property;
- finance/guest/reservation privacy.

Критичные вопросы:

- AI только отвечает или может менять данные?
- Какие tools разрешены для роли пользователя?
- Логируются ли персональные данные гостей?
- Можно ли дать feedback на ответ?
- Как ограничить доступ к данным другого отеля?

### 11.10. Универсальный impact prompt

Вставлять в каждое ТЗ:

```text
Перед оценкой задачи построи impact map.

1. Какая главная сущность меняется?
2. Какие связанные сущности будут прочитаны/изменены?
3. Какие экраны web/mobile/booking engine/Telegram затрагиваются?
4. Какие API endpoints затрагиваются?
5. Какие события, webhooks, RabbitMQ messages или внешние каналы затрагиваются?
6. Нужно ли пересчитывать цены, налоги, скидки, платежи, balance или reports?
7. Какие permissions нужны?
8. Какие данные нужно логировать для аудита?
9. Какие regression tests обязательны?
10. Что может сломаться в legacy-модулях?

Если impact map неполный, не принимай ТЗ как готовое. Сначала задай вопросы PM.
```

## 12. Скелет ТЗ для PM-системы

### Название задачи

`[Модуль] Краткое бизнес-название изменения`

### Бизнес-проблема

Опишите:

- кто сталкивается с проблемой;
- в каком процессе;
- что сейчас происходит;
- какой ущерб: деньги, время, ошибки, churn, support load.

### Цель

Формат:

`Дать [роль] возможность [действие], чтобы [измеримый результат].`

### Scope

Включено:

- конкретные экраны;
- API;
- роли;
- сущности;
- интеграции;
- отчеты/уведомления.

Не включено:

- явно перечислить, что не делаем в этой итерации.

### Роли и права

Таблица:

| Роль | Может | Не может | Условия |
|---|---|---|---|
| Hotelier owner | | | |
| Property user | | | |
| Housekeeper | | | |
| Guest | | | |
| Admin | | | |

### User stories

Формат:

- Как `[роль]`, я хочу `[действие]`, чтобы `[результат]`.
- Acceptance criteria:
  - Given ...
  - When ...
  - Then ...

### Бизнес-правила

Обязательно указать:

- статусы;
- переходы статусов;
- ограничения по датам/валютам/ролям;
- приоритеты правил;
- что происходит при ошибках;
- что логируется.

### Данные

Указать:

- какие сущности читаем;
- какие создаем/изменяем;
- какие поля обязательны;
- какие поля персональные/финансовые;
- retention/audit.

### Интеграции

Указать:

- внешние каналы;
- webhook/request/response формат;
- retry/idempotency;
- timeout;
- fallback;
- логи.

### UX

Указать:

- web/mobile/Telegram/booking engine;
- empty/loading/error states;
- permissions denied;
- локализация RU/UZ/EN;
- responsive/mobile behavior.

### Метрики успеха

Примеры:

- время создания бронирования;
- процент бронирований с назначенным номером;
- количество ошибок channel mapping;
- Telegram notification delivery rate;
- конверсия booking engine;
- количество обращений в поддержку.

### Тестирование

Обязательно:

- unit tests для бизнес-правил;
- API tests;
- integration tests для channel/webhook/RabbitMQ;
- e2e для критичных flow;
- regression по финансам и бронированиям;
- security tests для permissions.

## 13. Промпт для AI-аудита ТЗ

Вставьте после вашего ТЗ:

```text
Ты AI-ревьюер продуктового ТЗ SmartBooking. Проверь ТЗ как senior PM + solution architect.

Контекст продукта:
- SmartBooking управляет отелями, бронированиями, каналами продаж, booking engine, финансами, housekeeping, Telegram-уведомлениями и AI-ассистентом.
- Основной backend: Laravel 5.7/PHP 7.2.
- Web cabinet: Angular 9.
- Mobile app: React Native.
- Telegram bot: отдельный Laravel-сервис.

Проверь:
1. Есть ли противоречия в ролях, правах и доступах.
2. Все ли статусы и переходы статусов описаны.
3. Не ломает ли изменение бронирования, цены, налоги, платежи, allocation, folio, housekeeping, Telegram и channel manager.
4. Есть ли edge cases по датам, timezone, валютам, occupancy, min/max stay, закрытым датам.
5. Есть ли требования к idempotency, retry, logging, audit.
6. Есть ли требования к web, mobile, Telegram и booking engine, если изменение их затрагивает.
7. Достаточны ли acceptance criteria.
8. Какие вопросы нужно задать PM до передачи задачи в разработку.
9. Какие риски безопасности/персональных данных/финансов есть.
10. Какие тесты обязательны.

Ответ дай в структуре:
- Impact map
- Critical gaps
- Contradictions
- Missing business rules
- Missing technical contracts
- UX gaps
- Data/security risks
- Required test cases
- Questions to PM
- Recommended rewrite of unclear parts
```

## 14. Дополнительные блоки для идеального ТЗ и анализа новых фич

### 14.1. Feature Intake Form

Заполнять до написания ТЗ. Если часть ответов неизвестна, AI должен пометить ТЗ как неполное.

```text
Название фичи:

1. Проблема
- Что сейчас не работает или работает плохо?
- Кто страдает от проблемы?
- Как пользователь решает это сейчас?
- Какой ущерб: деньги, время, ошибки, поддержка, конверсия?

2. Пользователь
- Основная роль:
- Вторичные роли:
- Есть ли различия web/mobile/Telegram/booking engine?

3. Текущий процесс
- Шаг 1:
- Шаг 2:
- Шаг 3:
- Где именно возникает проблема?

4. Желаемый процесс
- Шаг 1:
- Шаг 2:
- Шаг 3:
- Что должно стать быстрее/проще/безопаснее?

5. Scope
- Включено:
- Не включено:
- Зависимости:
- Ограничения:

6. Затронутые модули
- Web:
- Mobile:
- API:
- Booking engine:
- Telegram:
- Channels:
- Finance:
- Reports:
- AI assistant:

7. Метрика успеха
- Основная метрика:
- Вторичные метрики:
- Как измеряем:

8. Релиз
- Нужен feature flag?
- Нужна миграция данных?
- Нужен rollback plan?
- Нужна коммуникация клиентам/поддержке?
```

### 14.2. Definition of Ready

AI должен вернуть `Ready` только если все критичные пункты закрыты.

| Критерий | Обязательно? | Статус |
|---|---:|---|
| Описана бизнес-проблема | Да | |
| Описана цель | Да | |
| Указаны роли | Да | |
| Указаны affected modules | Да | |
| Описан current flow | Да | |
| Описан target flow | Да | |
| Есть бизнес-правила | Да | |
| Есть statuses/transitions, если сущность статусная | Да | |
| Есть permissions | Да | |
| Описаны данные и поля | Да | |
| Описаны API/contracts | Да, если есть backend | |
| Описаны события/webhooks/RabbitMQ | Да, если есть интеграции | |
| Описано влияние на финансы/налоги/валюту | Да, если есть деньги/цены | |
| Есть edge cases | Да | |
| Есть acceptance criteria | Да | |
| Есть required tests | Да | |
| Есть rollout/rollback plan | Желательно | |

AI verdict format:

```text
Definition of Ready: Ready / Not Ready

Missing critical items:
1.
2.
3.

Can development start?
Yes/No, because ...
```

### 14.3. Глоссарий домена

AI должен использовать эти термины последовательно и не смешивать их.

| Термин | Значение в SmartBooking | Не путать с |
|---|---|---|
| Property | Отель/объект размещения в системе | Building |
| Building | Корпус/здание внутри property | Property |
| Room Type | Категория номера, например Standard/Luxe | Room |
| Room | Конкретный физический номер | Room Type |
| Inventory | Доступность room type по датам | Price |
| Price | Цена на дату/тариф/условие | Payment |
| Rate | Тарифный план/набор условий цены | Discount |
| Source | Источник бронирования, например walk-in, website, agency | Channel |
| Channel | Внешний канал продаж/OTA integration | Source |
| Property Channel | Подключение конкретного property к channel | Channel template |
| Reservation | Основная бронь | Reservation Room |
| Booking | В коде часто используется как синоним reservation | Guest booking engine profile |
| Reservation Room | Комната/сегмент внутри брони | Room |
| Guest | Физическое лицо/гость | Hotelier user |
| Company | Корпоративный клиент/компания | Travel agency |
| Travel Agency | Туристическое агентство/партнер продаж | OTA channel |
| Promo Code | Код, который вводит гость/сотрудник | Auto discount |
| Discount | Правило автоматической/управляемой скидки | Promo code |
| Tax and Fee | Налог/сбор | Charge |
| Charge | Начисление/платная позиция | Payment |
| Payment | Факт оплаты/платеж | Transaction |
| Reservation Transaction | Финансовая запись по брони | Payment only |
| Allocation | Распределение платежа/суммы по начислениям | Charge |
| Folio | Счет/группа финансовых операций гостя/брони | Reservation |
| Balance | Остаток/долг/переплата | Total price |
| Housekeeper | Сотрудник уборки | Property user |
| Daily Cleaning | Задача/запись уборки на дату | Room inspection |
| Room Inspection | Проверка/статус комнаты | Daily cleaning |
| Site Configuration | Настройки сайта/booking engine | Property profile |
| Property Widget | Виджет/активация booking engine | Booking engine site |
| AI Tool | Разрешенный инструмент AI-ассистента | Полный backend-доступ |

Правило для AI:

```text
Если в ТЗ используется термин booking, уточни: это reservation в PMS, booking engine booking гостя или external OTA booking?
```

### 14.4. State Machines

Если ТЗ меняет сущность со статусом, AI должен проверить разрешенные переходы. Ниже базовые state machine, которые нужно уточнить с бизнесом.

#### Reservation status

```text
draft/requested
  -> confirmed
  -> checked_in / arrived
  -> checked_out / left

confirmed
  -> cancelled
  -> no_show
  -> modified

checked_in / arrived
  -> checked_out / left

cancelled/no_show/checked_out
  -> terminal states, любые изменения требуют отдельного правила
```

Проверить:

- можно ли отменять после check-in;
- можно ли no-show после payment;
- можно ли редактировать даты после check-out;
- какие статусы приходят из OTA.

#### Reservation room status

```text
unassigned
  -> assigned
  -> moved
  -> split
  -> checked_in
  -> checked_out
  -> deleted/cancelled
```

Проверить:

- можно ли move, если гость уже заселен;
- как split влияет на цену и оплату;
- что происходит с housekeeping после move.

#### Payment/online payment status

```text
created
  -> pending
  -> paid/succeeded
  -> failed
  -> cancelled
  -> refunded / partially_refunded
```

Проверить:

- повторный callback;
- callback после cancel;
- частичный возврат;
- связь с reservation transaction.

#### Daily cleaning status

```text
new/unassigned
  -> assigned
  -> in_progress
  -> done
  -> verified/front_desk_confirmed
  -> rejected/reopened
```

Проверить:

- кто назначает housekeeper;
- кто подтверждает уборку;
- что отправляется в Telegram;
- что происходит при смене номера/даты брони.

#### Property channel status

```text
available
  -> connecting
  -> connected
  -> mapping_required
  -> active
  -> sync_error
  -> disconnected
```

Проверить:

- можно ли принимать брони до mapping;
- что делать при sync_error;
- кто может disconnect;
- что происходит с existing channel reservations.

#### Website/booking engine publication status

```text
draft
  -> configured
  -> preview
  -> published
  -> unpublished
  -> archived
```

Проверить:

- кто может publish;
- как работает rollback;
- влияет ли unpublished на существующие брони;
- активен ли payment при preview.

### 14.5. Permission Matrix

Заполнять для каждой фичи. AI должен проверять минимум эти действия.

| Действие | Owner/Hotelier | Manager | Front Desk | Accountant | Housekeeper | Guest | Admin |
|---|---|---|---|---|---|---|---|
| Смотреть брони | | | | | | | |
| Создать бронь | | | | | | | |
| Редактировать бронь | | | | | | | |
| Отменить бронь | | | | | | | |
| Заселить/выселить | | | | | | | |
| Move/assign room | | | | | | | |
| Split reservation | | | | | | | |
| Видеть финансы | | | | | | | |
| Создать payment/charge | | | | | | | |
| Делать refund | | | | | | | |
| Менять цены | | | | | | | |
| Bulk update цен | | | | | | | |
| Подключать каналы | | | | | | | |
| Менять channel mapping | | | | | | | |
| Управлять сайтом | | | | | | | |
| Publish сайт | | | | | | | |
| Управлять Telegram token | | | | | | | |
| Назначать уборку | | | | | | | |
| Закрывать уборку | | | | | | | |
| Управлять ролями | | | | | | | |
| Смотреть PII гостей | | | | | | | |
| Пользоваться AI-ассистентом | | | | | | | |

Правило для AI:

```text
Если в ТЗ есть действие изменения данных, но нет permission rule, это critical gap.
```

### 14.6. Event Catalog

Если фича создает или меняет событие, AI должен проверить producer, consumers, payload, retry, logs.

| Event | Producer | Consumers | Что проверить |
|---|---|---|---|
| `reservation.created` | API, booking engine, OTA import | Web, mobile, Telegram, reports, channels | idempotency, availability, price, guest, notifications |
| `reservation.updated` | API, OTA webhook, booking engine | Web, mobile, Telegram, reports, housekeeping | diff changes, old/new values, affected room/date |
| `reservation.cancelled` | API, guest, OTA | Finance, Telegram, reports, channels | refund, balance, cancellation reason |
| `reservation.no_show` | PMS | Finance, reports, Telegram | charge policy |
| `reservation.room.assigned` | PMS | Housekeeping, calendar, mobile | room availability |
| `reservation.room.moved` | PMS | Housekeeping, reports, Telegram | old room/new room |
| `reservation.room.split` | PMS | Finance, folio, housekeeping | split group, price distribution |
| `price.updated` | PMS bulk/manual | Booking engine, channels, reports | date range, rate, room type |
| `inventory.updated` | PMS/channel sync | Booking engine, channels | overbooking risk |
| `payment.created` | PMS/payment gateway | Finance, reports | amount, currency, reservation |
| `payment.succeeded` | Gateway callback | PMS, guest notification, reports | duplicate callback |
| `payment.failed` | Gateway callback | PMS, guest notification | retry/fail state |
| `refund.created` | PMS/payment gateway | Finance, reports | original payment link |
| `tax_fee.updated` | PMS settings | Reservation pricing, reports | versioning |
| `discount.updated` | PMS settings | Booking engine, reservation pricing | combinability |
| `promo_code.used` | Booking engine/PMS | Reports, reservation pricing | usage limit |
| `channel.connected` | PMS | Channels, audit logs | mapping required |
| `channel.disconnected` | PMS | Channels, audit logs | existing reservations |
| `channel.reservation.pushed` | OTA | PMS | idempotency, validation |
| `telegram.chat.linked` | Telegram bot | PMS/settings | token, chat type |
| `telegram.chat.deactivated` | PMS/bot | PMS/settings | token rotation |
| `daily_cleaning.assigned` | PMS | Telegram housekeeper | due date, room |
| `daily_cleaning.completed` | Telegram/PMS | Front desk, reports | verification |
| `site.published` | Website module | Site generator/CDN/domain | rollback |
| `ai_agent.message.created` | Web/mobile AI | AI logs/history | permissions, PII |
| `ai_agent.feedback.created` | Web/mobile AI | AI quality logs | rating/comment |

Event requirements template:

```text
Event name:
Producer:
Consumers:
Payload:
Idempotency key:
Retry policy:
Failure behavior:
Audit log:
User notification:
```

### 14.7. Edge Case Library

AI должен искать эти edge cases в каждом ТЗ и отмечать релевантные.

#### Бронирования

- Бронь создается на закрытую дату.
- Бронь создает overbooking.
- OTA прислал дубль брони.
- OTA прислал изменение после ручного изменения в PMS.
- Гость отменил бронь после check-in.
- Сотрудник меняет дату после оплаты.
- Сотрудник двигает заселенную комнату.
- Split reservation с уже распределенными платежами.
- Удаление reservation room с начислениями.
- No-show для частично оплаченной брони.

#### Цены и доступность

- Bulk update пересекает даты с существующими бронями.
- Min stay больше max stay.
- Closed on arrival и closed on departure конфликтуют с бронированием.
- Цена меняется в другой валюте.
- Нет цены на часть дат.
- Company price конфликтует с rate/channel price.
- Occupancy rule не покрывает число гостей.

#### Налоги, скидки, промокоды

- Скидка + промокод + налог применяются одновременно.
- Промокод истек, но был применен к существующей брони.
- Налог изменился после создания брони.
- Частичный refund при примененной скидке.
- Скидка применяется к service/product, хотя должна только к room revenue.
- Две скидки не должны комбинироваться, но обе подходят.

#### Платежи

- Payment callback пришел дважды.
- Payment succeeded после отмены брони.
- Refund больше суммы оплаты.
- Оплата в валюте, отличной от валюты брони.
- Allocation не сходится с balance.
- Payment link expired.
- Частичная оплата и изменение цены.

#### Каналы

- Channel mapping не завершен, но пришла бронь.
- Канал прислал unknown room type.
- Канал прислал unknown currency.
- Канал прислал отмену неизвестной брони.
- Одинаковый channel booking id пришел повторно.
- Sync price/inventory failed частично.

#### Telegram/housekeeping

- Token сменился, старый чат еще активен.
- Сотрудник уволился, но Telegram-группа получает уведомления.
- Housekeeper получил задачу на номер, который был moved.
- Telegram недоступен.
- Групповой чат привязан не к тому property.
- Язык чата не выбран.

#### Booking engine/site

- Гость начал оплату, а цена изменилась.
- Гость создал бронь, но payment failed.
- Site unpublished, но открыта активная payment link.
- Promo code применен в booking engine, но не сохранился в PMS.
- Guest token expired во время отмены брони.
- SEO/content обновлены, но сайт не опубликован.

#### AI-ассистент

- AI отвечает данными другого property.
- AI показывает PII пользователю без прав.
- AI предлагает действие, которое пользователь не может выполнить.
- AI tool меняет данные без audit log.
- Token limit property исчерпан.
- Feedback привязан не к тому сообщению.

### 14.8. AI Output Format

AI должен всегда отвечать в единой структуре.

```text
Verdict: Ready / Not Ready

1. Summary
- What the feature is:
- Main user:
- Main value:

2. Impact map
- Main entity:
- Related entities:
- Affected modules:
- Affected screens:
- Affected APIs:
- Affected events/integrations:
- Finance/tax/payment impact:
- Reporting impact:

3. Broken dependency risks
- Risk:
- Why it matters:
- Required clarification/fix:

4. Missing requirements
- Business rules:
- Permissions:
- Data fields:
- API contracts:
- Events:
- Error states:
- Localization:

5. Contradictions
- Contradiction:
- Where:
- Suggested resolution:

6. Questions to PM
1.
2.
3.

7. Required API changes
- Endpoint:
- Method:
- Request:
- Response:
- Validation:
- Errors:

8. Required DB/data changes
- Table/entity:
- Field:
- Migration:
- Backfill:
- Audit:

9. Required events
- Event:
- Producer:
- Consumers:
- Payload:
- Retry/idempotency:

10. Required tests
- Unit:
- API:
- Integration:
- E2E:
- Regression:
- Security/permission:

11. Release risks
- Migration risk:
- Rollback:
- Feature flag:
- Monitoring:
- Support notes:

12. Recommended rewrite
- Rewrite unclear parts of the ТЗ in clearer language.
```

## 15. Быстрый checklist перед передачей ТЗ разработке

- Роли и permissions описаны.
- Известны все затронутые экраны.
- Известны все затронутые API.
- Описаны статусы и transitions.
- Описаны ошибки и fallback.
- Указаны события/уведомления/RabbitMQ/webhooks.
- Указана логика финансов, налогов, скидок и валюты.
- Описаны тесты и acceptance criteria.
- Указаны метрики успеха.
- Проверено влияние на legacy-модули.

## 16. Финальные блоки для разработки, релиза и регрессии

### 16.1. Architecture Ownership Map

Использовать, чтобы понять, какие зоны разработки и владельцы затронуты. Если владелец неизвестен, AI должен отметить это как организационный риск.

| Зона | Репозиторий/модуль | За что отвечает | Когда затрагивается |
|---|---|---|---|
| Core API | `smartbooking-uz-smartbooking-api-65ff539ade83` | Данные, бизнес-логика, auth, bookings, prices, finance, channels | Почти все продуктовые изменения |
| Web cabinet | `smartbooking-uz-smartbooking-hotel-af91a9c61dd2` | Web-интерфейс отельера | Любые изменения экранов PMS/admin |
| Mobile app | `smartbooking-uz-sb-app-2022-aed31361aa41` | Мобильный интерфейс отельера | Dashboard, брони, статистика, AI, mobile flows |
| Telegram bot | `smartbooking-uz-smart-bot-2c1a5e836c5f` | Telegram webhooks, notifications, housekeeping, token binding | Уведомления, уборки, токены, отчеты в Telegram |
| Booking engine API | `smartbooking-api` / `Domain\BookingEngine` | Public booking flow, guest auth, payment flow, SEO/config | Прямые брони, сайт, платежи гостя |
| Site generator | `smartbooking-uz-site-generator-f913660dd7c5` | Конструктор/шаблоны сайтов | Публикация/дизайн/контент сайта |
| Hotel website | `smartbooking-uz-smartbooking-hotel-website-7d45f089bafc` | Frontend сайта отеля/template | Публичный сайт, UI сайта |
| Channels | `smartbooking-api` services `BookingCom`, `Expedia`, `Ostrovok`, `Bronevik`, `HR`, `MyBooking` | OTA/channel sync | Каналы, mapping, push reservation, price/inventory sync |
| Finance | `smartbooking-api` domains `Payments`, `Charges`, `ReservationTransactions`, `TaxAndFees`, `Folio` | Деньги, налоги, начисления, оплаты, balance | Все, что влияет на суммы |
| AI assistant | `smartbooking-api` domain `AIAgent`, web/mobile AI screens | Chat, tools, logs, feedback, token limits | AI-фичи и AI-доступ к данным |
| Reports/Analytics | `smartbooking-api` domains `Reports`, `Statistics`, web/mobile reports | Метрики, отчеты, dashboards | Любое изменение данных для отчетности |
| Permissions | `Roles`, `Permissions`, `PropertyUser`, guards | Доступы и роли | Новые действия/экраны/данные |

AI ownership prompt:

```text
Определи ownership impact:
- Какие зоны архитектуры затронуты?
- Какие репозитории нужно менять?
- Какие команды/ответственные должны участвовать?
- Есть ли cross-team dependency?
- Можно ли релизить частями?
```

### 16.2. Non-Functional Requirements

Каждая фича должна иметь NFR, если затрагивает критичные данные, деньги, каналы, публичный сайт или массовые операции.

| Категория | Вопросы для ТЗ |
|---|---|
| Performance | Какой объем данных? Нужна пагинация? Есть bulk update? Какой acceptable response time? |
| Security | Какие роли имеют доступ? Есть PII/финансы? Нужно masking/encryption? |
| Audit | Что логируем? Кто изменил? Старое/новое значение? Как долго хранить? |
| Reliability | Что при ошибке внешнего сервиса? Retry? DLQ? Manual recovery? |
| Idempotency | Может ли запрос/webhook/event прийти повторно? Как избежать дублей? |
| Backward compatibility | Нужно ли сохранить старый API/формат? Есть mobile app старой версии? |
| Localization | RU/UZ/EN? Кто переводит? Что если перевода нет? |
| Accessibility | Есть ли требования к keyboard/screen reader/contrast? |
| Monitoring | Какие метрики и алерты нужны? Где смотреть ошибки? |
| Data retention | Как долго храним логи, PII, payment data, AI conversations? |
| Compliance | Есть ли PCI/карточные данные/персональные данные? |
| Scalability | Что будет при росте properties/channels/reservations? |

NFR template:

```text
Performance:
- Expected volume:
- Max response time:
- Pagination/bulk limits:

Security:
- Roles:
- Sensitive data:
- Protection:

Audit:
- Events to log:
- Old/new values:
- Retention:

Reliability:
- Retry:
- Failure behavior:
- Manual recovery:

Monitoring:
- Metrics:
- Alerts:
- Dashboards/logs:
```

### 16.3. Release Strategy Template

Использовать для всех фич с миграциями, деньгами, каналами, бронированиями, Telegram или public booking engine.

```text
Release strategy:

1. Release type
- Backend only:
- Frontend only:
- Backend + frontend:
- Multi-repo:
- Public customer-visible:

2. Feature flag
- Required: Yes/No
- Flag name:
- Who can enable:
- Rollout percentage/properties:

3. Migration
- DB migration:
- Backfill:
- Data validation query:
- Migration rollback:

4. Compatibility
- Old mobile versions supported:
- Old web bundle supported:
- Old API consumers:
- External channel compatibility:

5. Rollout plan
- Internal testing:
- Pilot property:
- Gradual rollout:
- Full rollout:

6. Monitoring
- Logs:
- Metrics:
- Alerts:
- First 24h checks:

7. Rollback plan
- How to disable:
- How to revert DB safely:
- What happens to already-created data:
- Customer impact:

8. Support readiness
- Support script:
- FAQ:
- Known errors:
- Manual workaround:

9. Customer communication
- Needed: Yes/No
- Audience:
- Message:
- Timing:
```

AI release prompt:

```text
Проверь, можно ли безопасно релизить эту фичу. Если нет feature flag, rollback, monitoring или migration plan при изменении критичных данных, пометь как release blocker.
```

### 16.4. Regression Risk Map

AI должен автоматически предлагать regression tests по затронутым зонам.

| Изменение | Регрессия, которую нужно проверить |
|---|---|
| Reservation create | availability, price calculation, guest creation, taxes, payment state, Telegram |
| Reservation update dates | inventory, price recalculation, housekeeping, channel updates, reports |
| Reservation cancel | balance, refunds, cancellation reports, OTA status, Telegram |
| Room assignment/move | calendar, housekeeping, split groups, mobile detail |
| Split reservation | prices, transactions, folio, balance, reports |
| Price update | booking engine search, channels, existing reservations, reports |
| Bulk update | date ranges, partial failure, rollback, channel sync |
| Tax/fee update | new bookings, existing bookings, versions, reports |
| Discount/promo code | price display, combinability, limits, cancellation/refund |
| Payment flow | duplicate callback, failed callback, balance, folio, reports |
| Currency change | old reservations, initial sums, reports, payment reconciliation |
| Channel mapping | import reservations, push reservations, price/inventory sync |
| OTA webhook | idempotency, unknown room/rate, cancellation, modification |
| Telegram token | chat deactivation, relink, notifications delivery |
| Daily cleaning | assignment, room move, task status, Telegram messages |
| Website content | preview, publish, rollback, SEO |
| Booking engine create | availability, guest auth, promo, payment, reservation token |
| AI assistant | permission isolation, logs, token limit, PII exposure |
| Roles/permissions | access denied states, hidden actions, API enforcement |

Regression test template:

```text
Regression areas:
- Reservation:
- Pricing:
- Finance:
- Channels:
- Booking engine:
- Telegram:
- Reports:
- Permissions:
- Mobile:
- AI:

Must-pass smoke tests:
1.
2.
3.
```

### 16.5. Data Contract Template

Использовать для API, events, webhooks и RabbitMQ messages.

#### API contract

```text
Endpoint:
Method:
Auth/permission:
Purpose:

Request:
{
}

Validation:
- field:
- rule:
- error:

Response success:
{
}

Response errors:
- 400:
- 401:
- 403:
- 404:
- 409:
- 422:
- 500:

Idempotency:
- Required: Yes/No
- Key:
- Duplicate behavior:

Audit:
- Log event:
- Old values:
- New values:

Backward compatibility:
- Existing consumers:
- Deprecated fields:
- Migration period:
```

#### Event/webhook/RabbitMQ contract

```text
Event name:
Transport: RabbitMQ / webhook / internal event / websocket / push
Producer:
Consumers:
Trigger:

Payload:
{
}

Required fields:
-

Optional fields:
-

Idempotency key:
Ordering requirements:
Retry policy:
Dead-letter behavior:
Failure notification:
Audit log:
Example payload:
```

Rule for AI:

```text
Если ТЗ упоминает API, webhook, RabbitMQ, channel sync или mobile/backend integration, но не содержит contract, это missing technical contract.
```

### 16.6. Examples of Good and Bad ТЗ

#### Плохое ТЗ

```text
Добавить скидки для гостей.
В кабинете должна быть возможность создать скидку, а на сайте она должна применяться.
```

Почему плохо:

- не указаны роли;
- не указано, где создается скидка;
- нет типов скидок;
- нет правил совместимости с promo codes;
- нет влияния на налоги;
- нет влияния на payments/balance/reports;
- нет API/data/events;
- нет edge cases;
- нет acceptance criteria.

#### Хорошее ТЗ

```text
Название:
Website discounts: автоматические скидки для прямых бронирований.

Проблема:
Отельеры хотят запускать акции на сайте без ручного изменения базовых цен. Сейчас скидки приходится учитывать вручную, из-за чего появляются ошибки в цене и отчетах.

Пользователь:
Owner/Manager отеля в web cabinet.

Scope:
Включено:
- создание/редактирование/деактивация discount в Website/Marketing;
- применение discount в booking engine search/create;
- сохранение applied discount в reservation;
- отображение discount в reservation detail;
- учет discount в reports.

Не включено:
- OTA/channel discounts;
- ручная скидка в существующей брони;
- loyalty program.

Бизнес-правила:
- discount может быть percent или fixed amount;
- discount имеет date range;
- discount может быть ограничен room type/rate;
- discount применяется до tax calculation;
- discount не комбинируется с promo code, если `combinable=false`;
- discount фиксируется в reservation at creation time;
- изменение discount не пересчитывает существующие брони.

Permissions:
- Owner/Manager: create/update/deactivate;
- Front Desk: view only;
- Guest: видит примененную скидку в booking engine;
- Housekeeper: no access.

Impact:
- API: discounts, booking-engine search/create;
- DB: discounts, discount_rate, discount_room_type, reservation_discounts;
- Finance: reservation total, tax calculation, balance;
- Reports: revenue after discount;
- Booking engine: price display;
- Mobile: reservation detail read-only.

Acceptance criteria:
1. Given active percent discount for selected room type, when guest searches available rooms, then discounted price is shown.
2. Given promo code and non-combinable discount, when guest applies promo code, then system applies only the higher priority rule and explains the result.
3. Given reservation created with discount, when discount is later deactivated, then existing reservation total does not change.
4. Given user without permission, when opening discount settings, then action buttons are hidden and API returns 403.

Required tests:
- unit: DiscountMatcher, DiscountCalculator;
- API: CRUD discounts, booking engine create;
- integration: tax + discount + promo;
- e2e: guest books with discount;
- regression: reservation balance and reports.
```

AI rewrite instruction:

```text
Если ТЗ похоже на плохой пример, перепиши его в структуру хорошего ТЗ и отдельно перечисли вопросы, без которых нельзя начинать разработку.
```

## 17. Что нужно собрать дополнительно от бизнеса

- Целевой рынок и языки: RU/UZ/EN?
- Приоритеты: PMS, channel manager, booking engine, Telegram, mobile, AI?
- Pricing/billing модели самой платформы.
- SLA для каналов и уведомлений.
- Матрица прав сотрудников.
- Поддерживаемые платежные провайдеры.
- Политика хранения персональных и финансовых данных.
- Список активных legacy-модулей: tour, driver, guide, cash drawer.
- Roadmap по AI-ассистенту.

## 18. Защитные механизмы против неверных выводов AI

Эти правила нужны, чтобы AI не фантазировал и не выдавал предположения за факты. Для каждой новой фичи AI должен явно отделять доказанные факты, неизвестные места, допущения и принятые решения.

### 18.1. Evidence Requirement

Каждый важный вывод AI должен иметь один из статусов:

| Статус | Значение | Как писать |
|---|---|---|
| Confirmed by code | Подтверждено локальной кодовой базой | `Confirmed by code: ...` |
| Confirmed by PM | Подтверждено продуктовым решением PM | `Confirmed by PM: ...` |
| Assumption | Допущение AI/аналитика | `Assumption: ...` |
| Unknown | Неизвестно, требует уточнения | `Unknown: ...` |
| Needs dev confirmation | Нужно подтверждение разработчика | `Needs dev confirmation: ...` |
| Legacy risk | Есть признаки legacy/неактивного модуля | `Legacy risk: ...` |

Правило:

```text
AI не должен писать "система делает X", если это не подтверждено кодом, PM или документацией.
Если доказательства нет, писать "Assumption" или "Unknown".
```

Evidence table для каждого ТЗ:

| Вывод/требование | Evidence status | Источник | Риск, если неверно |
|---|---|---|---|
| | Confirmed by code / PM / Assumption / Unknown | file/API/PM answer | |

Пример:

| Вывод/требование | Evidence status | Источник | Риск, если неверно |
|---|---|---|---|
| Скидка не пересчитывает существующие брони | Confirmed by PM | Decision Log | Финансовые расхождения |
| Booking engine использует promo codes | Confirmed by code | `booking_engine.php`, `PromoCodeController` | Ошибка в public booking flow |
| Cash drawer активен в продукте | Unknown | API routes закомментированы | Лишняя разработка legacy-модуля |

AI output rule:

```text
В каждом ревью ТЗ добавь раздел "Evidence". Если больше 3 критичных требований имеют статус Unknown/Assumption, verdict должен быть Not Ready.
```

### 18.2. Unknowns & Assumptions Register

Для каждой фичи AI должен вести реестр неизвестных мест и допущений.

```text
Unknowns & Assumptions Register

| ID | Type | Item | Current assumption | Risk | Owner to confirm | Status |
|---|---|---|---|---|---|---|
| UA-001 | Unknown | | | | PM/Dev/Design/Support | Open |
| UA-002 | Assumption | | | | PM/Dev/Design/Support | Open |
```

Типы:

- `Unknown` - информации нет.
- `Assumption` - AI сделал допущение.
- `Dependency` - нужна информация от другой команды/сервиса.
- `Conflict` - есть противоречие в требованиях/коде.
- `Legacy` - непонятно, активен ли модуль.

Пример:

| ID | Type | Item | Current assumption | Risk | Owner to confirm | Status |
|---|---|---|---|---|---|---|
| UA-001 | Unknown | Нужно ли пересчитывать существующие брони при изменении discount? | Нет, только новые брони | Потеря денег/споры с гостями | PM | Open |
| UA-002 | Legacy | Cash drawer routes закомментированы | Модуль неактивен | Можно случайно сломать скрытую функцию | Dev lead | Open |
| UA-003 | Dependency | Booking engine publish flow | Source of truth - API | Сайт может не обновиться | Frontend/API dev | Open |

AI rule:

```text
Если Unknown влияет на деньги, бронирования, каналы, персональные данные или платежи, это blocker до уточнения.
```

### 18.3. Decision Log

Все продуктовые решения, которые меняют поведение системы, должны фиксироваться отдельно. Это особенно важно для правил цен, платежей, отмен, прав доступа и интеграций.

```text
Decision Log

| ID | Date | Decision | Reason | Alternatives considered | Confirmed by | Affected modules | Revisit condition |
|---|---|---|---|---|---|---|---|
| D-001 | YYYY-MM-DD | | | | PM/CEO/Tech Lead | | |
```

Примеры решений, которые обязательно фиксировать:

- существующие брони не пересчитываются после изменения скидки;
- OTA webhook имеет приоритет над ручным изменением или наоборот;
- refund делается вручную, а не автоматически;
- Telegram token rotation деактивирует все старые чаты;
- guest cancellation доступна только до check-in;
- AI-ассистент может только читать данные, но не менять;
- site publish требует ручного подтверждения owner;
- promo code и discount не комбинируются.

Пример:

| ID | Date | Decision | Reason | Alternatives considered | Confirmed by | Affected modules | Revisit condition |
|---|---|---|---|---|---|---|---|
| D-001 | 2026-04-30 | Изменение discount не пересчитывает существующие брони | Зафиксированная цена гостя не должна меняться после создания брони | Пересчитывать все unpaid брони | PM | Booking engine, reservations, finance, reports | Если появится отдельная manual recalculation feature |
| D-002 | 2026-04-30 | AI-ассистент в первой версии только читает данные | Снизить риск несанкционированных изменений | Разрешить write actions по permission | PM + Tech Lead | AI assistant, permissions, audit | После внедрения approval flow |

AI rule:

```text
Если ТЗ содержит бизнес-правило с долгосрочным влиянием, но оно не записано в Decision Log, AI должен предложить добавить решение.
```

### 18.4. Final AI Guardrail Prompt

Добавлять к каждому анализу ТЗ:

```text
Перед финальным выводом выполни guardrail check:

1. Раздели все важные утверждения на:
   - Confirmed by code
   - Confirmed by PM
   - Assumption
   - Unknown
   - Needs dev confirmation
   - Legacy risk

2. Составь Unknowns & Assumptions Register.

3. Проверь, есть ли решения, которые нужно добавить в Decision Log.

4. Если есть Unknown/Assumption, влияющий на деньги, бронирования, каналы, платежи, PII или безопасность, verdict должен быть Not Ready.

5. Не предлагай разработку до закрытия blocker-unknowns.
```
