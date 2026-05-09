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
- **DB бэкап перед миграциями** — критично, без этого можно потерять статистику пользователя.
- **macOS LSUIElement = true** через `setActivationPolicy(Accessory)` — без иконки в доке.

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
