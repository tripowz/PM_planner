# SmartBooking DB Entities Summary

Generated: 2026-04-30
Source: $api\database\migrations, $api\app\Domain

## Migration overview

Total migration files: 399

| Year | Migration files |
|---|---:|
| 2014 | 2 |
| 2017 | 55 |
| 2018 | 56 |
| 2019 | 65 |
| 2020 | 21 |
| 2021 | 58 |
| 2022 | 31 |
| 2023 | 20 |
| 2024 | 18 |
| 2025 | 43 |
| 2026 | 30 |

Latest migration range observed: through March 2026. Treat DB state as actively evolved; verify production migration status before any schema-dependent spec.

## Domain directories

Admins, AIAgent, Api, Applications, Beds, BookingEngine, BookingNotes, Buildings, Calendar, CarClasses, CashDrawers, Channels, Charges, Chats, Cities, Companies, Contracts, Countries, Currencies, Discounts, DocumentTypes, DriverApplications, DriverCalendar, Drivers, Facilities, Financial, FuelTypes, GuestNotes, Guests, GuideApplications, GuideCalendar, Guides, Hoteliers, HotelRequests, HotelRunner, HouseKeepers, ImageNames, Images, Languages, Logs, Notifications, PaymentGateway, PaymentTypes, Products, PromoCodes, Properties, PropertyChannels, PropertyPrices, PropertyTypes, PropertyUser, Rates, Reports, ReservationBlockFields, ReservationGuests, ReservationNotes, Reservations, ReservationTransactions, Roles, RoomHolds, RoomNames, Rooms, RoomTypeCalendar, RoomTypeInventory, RoomTypeOccupancies, RoomTypePrices, RoomTypes, Services, Sources, Statistics, TaxAndFees, TourCompanies, TourOperators, Users

## Created/known table names extracted from migration filenames

ai_agent_conversations, ai_agent_logs, api_client_logs, api_clients, applications, bed_room_type, bed_translations, beds, block_update_reservation_fields, booking_com_request_logs, booking_engine_seo, booking_engine_sites, booking_notes, booking_room_guest, booking_room_prices, booking_rooms, booking_scores, bookings, building_translations, buildings, car_images, cash_drawer_report_currencies, cash_drawer_reports, cash_drawers, channel_templates, charge_types, charges, chat_messages, chats, cities, city_translations, companies, company_contract_prices, company_contract_rate_reservation_room, company_contract_rates, company_contract_rules, company_contracts, company_legal_information, company_range_prices, company_ranges, company_rate_prices, company_rates, contract_discounts, contract_rules, contracts, countries, country_translations, currencies, currency_names, daily_cleanings, discount_combinable, discount_rate, discount_room_type, discounts, document_type_translations, document_types, driver_applications, driver_profiles, email_verifications, entity_translations, facilities, facility_group_translations, facility_groups, facility_room_type, facility_translations, failed_jobs, folio, guest_hotelier_note, guest_hotelier_notes, guest_personal_access_tokens, guest_reservation, guests, h_r_data, holds, hotel_requests, house_keepers, image_name_translations, image_names, image_property, image_room_type, images, jobs, language_property, language_translations, languages, notifications, object_histories, online_payments, page_role, pages, password_resets, payment_types, payments, permission_role, permissions, phone_password_resets, phone_verifications, product_categories, product_category_translations, product_translations, products, promo_codes, properties, properties_users, property_channel_room_occupancies, property_channel_room_rate, property_channels, property_contacts, property_data, property_reviews, property_service, property_translation_moderations, property_translations, property_type_translations, property_types, property_user, property_widgets, rate_channel, rate_room_type, rate_tax_and_fee, rate_travel_agency, rates, reservation_discounts, reservation_extra_infos, reservation_guests, reservation_logs, reservation_promo_codes, reservation_room_price_details, reservation_tax_and_fee_reservation_transaction, reservation_tax_and_fees, reservation_token, reservation_transaction_allocations, reservation_transaction_products, reservation_transactions, role_permissions, role_user, roles, room_inspections, room_name_group_translations, room_name_groups, room_name_translations, room_names, room_translations, room_type_hour_prices, room_type_inventory, room_type_mapping, room_type_occupancy, room_type_prices, room_type_translation_moderations, room_type_translations, room_types, rooms, service_group_translations, service_groups, service_translations, services, source_settings, source_translations, sources, split_groups, tables_for_guide, tax_and_fee_versions, tax_and_fees, tax_and_fees_channel, tax_and_fees_company, tax_and_fees_source, tokens_cemetery, transactions, travel_agencies, user_avatars, user_invites, users, websockets_statistics_entries

## Core entity groups for PM/AI impact analysis

### Property and setup

- users, roles, permissions, property_user;
- properties, property_translations, property_data, property_types;
- buildings, rooms, room_types, room_names, beds, facilities, services, languages, images/image_names;
- source settings, sources, document types, countries/cities/currencies.

### Availability and pricing

- room_type_inventory;
- room_type_prices;
- room_type_hour_prices;
- room_type_occupancy;
- rates, rate_room_type, rate_channel, rate_travel_agency, rate_tax_and_fee;
- company_ranges, company_range_prices.

### Reservations

- reservations;
- reservation_rooms;
- reservation_guests / guest_reservation;
- reservation_room_prices / details;
- reservation_notes / guest notes;
- reservation_logs;
- reservation_extra_infos;
- block_update_reservation_fields;
- split_groups;
- holds.

### Guests and identity

- guests;
- guest_personal_access_tokens;
- document_types;
- guest notes/history relationships.

### Finance

- payment_types, payments, charges, charge_types;
- reservation_transactions;
- reservation_transaction_products;
- reservation_transaction_allocations;
- folio;
- online_payments;
- cash_drawers and cash_drawer reports exist, but some routes are commented out in API; confirm active status before scoping.

### Taxes, discounts, promo

- tax_and_fees;
- tax_and_fee_versions;
- reservation_tax_and_fees;
- promo_codes, reservation_promo_codes;
- discounts, discount_rate, discount_room_type, discount_combinable, reservation_discounts.

### Channels and integrations

- channels;
- property_channels;
- property_channel_rooms / room rates / occupancies;
- channel_templates;
- api_clients, api_client_logs;
- booking_com_request_logs;
- H/R data and external channel fields on reservations.

### Booking engine and website

- property_widgets;
- booking_engine_sites;
- booking_engine_seo;
- property_reviews;
- property_contacts;
- reservation_token;
- entity_translations.

### Housekeeping and Telegram-facing data

- house_keepers;
- room_inspections;
- daily_cleanings;
- notifications;
- telegram token fields on properties and housekeepers.

### AI assistant

- ai_agent_logs;
- ai_agent_conversations;
- ai_token_limit field on property_data.

## AI rule

For any feature touching money, reservations, channels, public booking, or PII, require explicit DB/data impact: entities read, entities written, audit/logging, migration/backfill, and rollback behavior.
