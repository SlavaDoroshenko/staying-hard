# CLAUDE.md

## Что это

Self-care reminder app для одного человека с режимом 12:00 — 03:00. Tauri 2 + React + TypeScript + Tailwind. Всё хранится локально в SQLite. См. план в `C:\Users\slava\.claude\plans\indexed-wibbling-hopper.md` и оригинальное ТЗ в `c:\Users\slava\Downloads\self-care-app-spec_1.md`.

## КРИТИЧНО: дизайн-язык

**Перед тем как написать любой UI — прочитай [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).**

Концепция: *editorial calm, late-night terminal*. Тёплая warm-ink база, Fraunces (display) + Onest (body) + JetBrains Mono (метаданные), один акцент clay-amber, hairline rows вместо cards, lowercase + точка в конце фраз. Никаких entry-анимаций для часто-просматриваемого контента (главный экран). Только button press scale(0.97) + blur cross-fade на confirmation.

Если впервые делаешь визуальный экран — сначала перечитай DESIGN_SYSTEM.md, потом пиши.

## Архитектурные инварианты

- **Расписания — wall-clock (локальное время)**, не UTC. Иначе сломается на DST. См. [src/lib/schedule/next-fire.ts](src/lib/schedule/next-fire.ts).
- **Планировщик — на стороне Rust** ([src-tauri/src/scheduler.rs](src-tauri/src/scheduler.rs)). `setTimeout` в renderer'е не переживает sleep/wake macOS.
- **Hard-нотификации**: окно с `closable: false` + `CloseRequested` перехвачен в Rust до резолва ([src-tauri/src/notification_window.rs](src-tauri/src/notification_window.rs)).
- **Single-instance — обязателен** ([src-tauri/src/lib.rs](src-tauri/src/lib.rs)). Без него двойной запуск дублирует планировщик.
- **DB бэкап перед миграциями** — реализовано в [src-tauri/src/db.rs](src-tauri/src/db.rs) `backup_db_before_migration`. Хранит 3 последних копии в `app_data_dir()/data.db.backup-{ts}`.
- **macOS LSUIElement = true** через `setActivationPolicy(Accessory)` — без иконки в доке.

## Миграции SQL — иммутабельны после релиза

**Никогда не редактируй уже зарелизенный файл миграции.** Только добавляй новые версии (`0002_*.sql`, `0003_*.sql`).

`tauri-plugin-sql` использует `sqlx`, который при каждом старте пересчитывает SHA-256 каждого migration-файла и сравнивает со stored checksum в `_sqlx_migrations` таблице. Если не совпадает — приложение падает с `migration N was previously applied but has been modified` и **все** SQL-операции перестают работать. У пользователей с уже применённой миграцией БД станет неработоспособной — единственный путь восстановления это полный сброс через Settings → "сбросить локальную базу" (или ручное удаление `data.db`).

История уже накосячена: между моими dev-итерациями и v0.1.0 commit'ом текст `0001_init.sql` менялся, поэтому у пользователей, чей `data.db` был создан "в процессе", сейчас checksum mismatch с релизной версией.

**Правило**: если нужно изменить схему — `cp 0001_init.sql 0002_alter_X.sql`, дописать ALTER, добавить новый `Migration { version: 2, ... }` в [src-tauri/src/lib.rs](src-tauri/src/lib.rs).

## Деплой

- GitHub Releases + Tauri auto-update (ed25519 self-key, без Apple Developer ID).
- Только NSIS на Windows (без MSI), универсальный DMG на macOS.
- Подробности в плане.

## Команды

```bash
pnpm tauri dev       # запустить dev
pnpm test            # vitest unit-тесты (next-fire)
pnpm build           # тип-чек + Vite build
cd src-tauri && cargo check    # проверка Rust
```
