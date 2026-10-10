# Творения reusrush

Готовый сайт-галерея для публикации картинок.

## Что используется

- Vercel — сайт и API
- Supabase — база данных + хранение картинок
- GitHub — хранение кода

## Переменные Vercel

Добавь в Project Settings → Environment Variables:

SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ADMIN_CODE

Задай `ADMIN_CODE` как приватное значение только в Environment Variables проекта Vercel. Не добавляй его в README или исходный код.


Никогда не публикуй SUPABASE_SERVICE_ROLE_KEY в браузерном JavaScript.

## Supabase

1. Создай проект.
2. Открой SQL Editor.
3. Вставь содержимое supabase.sql и выполни.
4. Создай Storage bucket с именем `artworks` и поставь его Public.
5. Добавь переменные в Vercel.

## Локально

npm install
npm start

Для локального запуска нужен Vercel CLI, потому что API находится в /api.
