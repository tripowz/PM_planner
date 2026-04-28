# PM Cockpit

Персональный PM-инструмент для SmartBooking на Vite + React + TypeScript + Zustand + Tailwind.

## Запуск

```bash
npm install
npm run dev
```

Локальный URL: `http://localhost:5173/`.

Приложение работает без Supabase в локальном демо-режиме: данные сохраняются в `localStorage`. Для подключения Supabase скопируйте `.env.example` в `.env.local`, заполните ключи и примените миграцию из `supabase/migrations/20260424000000_initial_schema.sql`.

## Что реализовано

- Today с MIT, нуджами, быстрым выбором задачи и Pomodoro.
- Kanban Board с drag-and-drop и жёстким WIP-лимитом 3 для «В работе».
- Inbox / Backlog с bulk actions.
- Системные флаги SmartBooking, журнал решений, ретро, шаблоны, заметки с Markdown.
- Command palette, hotkeys, экспорт JSON/CSV, импорт JSON.
- Dark/light theme, responsive layout, production build.

## Проверка

```bash
npm run build
```
