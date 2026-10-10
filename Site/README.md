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
3. Для нового проекта вставь содержимое `supabase.sql` и выполни. Если сайт и таблица `artworks` уже существуют, НЕ удаляй таблицу и не запускай сброс данных — выполни только `bilingual_credits.sql`, чтобы безопасно добавить английские поля и настройки Credits.
4. Создай Storage bucket с именем `artworks` и поставь его Public.
5. Добавь переменные в Vercel.

## Языковые версии и Credits\n\n- `/Russian` открывает русскую версию, `/English` — английскую.\n- Для существующей базы выполни `bilingual_credits.sql` в Supabase SQL Editor. Миграция не удаляет и не пересоздаёт публикации.\n- Английские названия и описания заполняются вручную через 🌐 в форме публикации или редактирования.\n- Текст Credits хранится в таблице `site_settings` и редактируется через админ-панель.\n\n## Локально

npm install
npm start

Для локального запуска нужен Vercel CLI, потому что API находится в /api.
