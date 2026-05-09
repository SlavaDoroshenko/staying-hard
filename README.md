# Staying Hard

> Личное приложение-напоминалка для человека с режимом 12:00 — 03:00. Внешние сигналы для еды, воды, гигиены и уборки, потому что в потоке работы это всё забывается.

Десктоп-приложение для macOS и Windows на Tauri 2 + React. Локальный SQLite. Auto-update через GitHub Releases.

---

## Установка

### macOS (Apple Silicon)

1. Скачай `Staying Hard_x.y.z_universal.dmg` из [последнего релиза](https://github.com/lvldottech/staying-hard/releases/latest).
2. Открой DMG, перетащи в Applications.
3. **Первый запуск:** правый клик по иконке приложения → **Open** → подтверди в системном диалоге.

   Альтернатива через терминал:
   ```bash
   xattr -dr com.apple.quarantine /Applications/Staying\ Hard.app
   ```

   > **Это нужно повторять после каждого обновления.** У приложения нет подписи Apple Developer ID ($99/год), поэтому Gatekeeper по умолчанию его блокирует.

### Windows 11

1. Скачай `Staying Hard_x.y.z_x64-setup.exe` из [последнего релиза](https://github.com/lvldottech/staying-hard/releases/latest).
2. Запусти. SmartScreen покажет "Защитник Windows запретил запуск...".
3. Нажми **More info** → **Run anyway**.
4. Дальше — обычная установка через NSIS.

> Обновления потом подтягиваются автоматически — при старте + раз в сутки.

---

## Что внутри

- **Сегодня** — чек-лист задач на день, отсортированный по времени, с галочкой и статусом.
- **Расписание** — CRUD задач по еде/воде/гигиене с 4 типами расписаний (фиксированные времена, интервал, ежедневно, каждые N дней).
- **Уборка** — зоны уборки с оценкой времени.
- **Статистика** — сколько сделано сегодня, неделя бар-чартом, текущий streak, топ-5 пропусков за 14 дней.
- **Настройки** — autostart, звук, экспорт/импорт JSON, тест-уведомление.

**Уведомления:**
- *Soft* (еда, вода) — окно поверх всего, можно закрыть крестиком (засчитается как `missed`). У еды — quick actions: "заказал доставку", "съел что-то быстрое".
- *Hard* (душ, уборка) — окно нельзя закрыть. Только "сделал" / "пропускаю осознанно" (с подтверждением).

Без snooze. Принципиально.

Дизайн-язык — [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

---

## Разработка

### Требования

- Node 22+, pnpm 10+
- Rust 1.77+
- Платформа: Windows или macOS
- (macOS) Xcode Command Line Tools
- (Windows) MSVC build tools (приходят с Rust установщиком)

### Старт

```bash
pnpm install
pnpm tauri dev
```

Главное окно откроется. Если приложение в трее, но окно не видно — клик по иконке в трее.

### Команды

| | |
|---|---|
| `pnpm tauri dev` | dev-режим с hot-reload |
| `pnpm test` | unit-тесты (`vitest`, only `next-fire` пока) |
| `pnpm build` | tsc + vite build |
| `pnpm tauri build` | полная сборка приложения локально |
| `cd src-tauri && cargo check` | проверка Rust |

---

## Деплой

### Первый раз: ключ Tauri-апдейтера

Auto-update подписывается **своим** ed25519-ключом (НЕ Apple Developer ID). Сгенерируй один раз:

```bash
pnpm tauri signer generate -w ~/.tauri/staying-hard.key
```

Команда выведет:
- **Public key** — вставь в [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json) → `plugins.updater.pubkey` (заменив плейсхолдер).
- **Private key path** — `~/.tauri/staying-hard.key` (НЕ коммить!).
- **Password** — придумай и запомни (можно пустой для теста).

Затем в GitHub-репозитории добавь secrets:
- `TAURI_SIGNING_PRIVATE_KEY` — содержимое файла `~/.tauri/staying-hard.key` целиком (`cat ~/.tauri/staying-hard.key`)
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — твой пароль (или пустая строка)

### Релиз

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions ([workflow](.github/workflows/release.yml)):
1. Параллельно собирает на `windows-latest` (NSIS .exe) и `macos-latest` (universal .dmg).
2. Подписывает `latest.json` Tauri-ключом.
3. Создаёт **draft** релиз с артефактами.
4. Заходи в GitHub → Releases → проверяй артефакты → publish.

После публикации — приложение само подтянет обновление при следующем запуске.

---

## Архитектура — кратко

- **Frontend** — React 18 + TS + Vite. Tailwind 3 + минимальный shadcn. Zustand для состояния.
- **Bundle bridge** — Tauri 2: окна, трей, autostart, single-instance, updater.
- **Storage** — SQLite через `tauri-plugin-sql`. Миграции в [src-tauri/migrations/](src-tauri/migrations/).
- **Scheduler** — на стороне Rust ([src-tauri/src/scheduler.rs](src-tauri/src/scheduler.rs)). `setTimeout` в renderer'е не переживёт sleep/wake macOS, поэтому tokio-тик каждые 30 секунд + observer `NSWorkspaceDidWakeNotification`.
- **Notification windows** — отдельные `WebviewWindow`'ы. Hard-уведомления имеют `closable: false` и перехватывают `CloseRequested` в Rust до резолва.
- **Без synchronization, без backend, без аккаунтов.** Локально и личное.

Подробный план — `~/.claude/plans/indexed-wibbling-hopper.md` (если запускал через Claude Code).

---

## Лицензия

Personal use. Без обязательств перед кем-либо.
