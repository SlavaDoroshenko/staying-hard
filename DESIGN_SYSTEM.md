# Staying Hard — Design System

> **Принцип номер один:** новый экран должен выглядеть так, будто его написал тот же человек в ту же ночь.

Это не SaaS и не маркетинговая страница. Это персональный инструмент для одного человека, работающего после полуночи. Дизайн-язык подчиняется этой роли: спокойный, фактический, литературный, тёплый. Любая яркость, любая декоративность, любая "веселость" — против духа этого приложения.

---

## 1. Концепция: Editorial Calm, Late-Night Terminal

| | |
|---|---|
| **Что мы строим** | Личный блокнот напоминаний, который не повышает стресс. |
| **Тон голоса** | Без осуждения. Только факты. Lowercase. Точка в конце фразы. |
| **Эмоциональный диапазон** | От нейтрального до тихо-тёплого. Никогда не игривый, никогда не драматический. |
| **Визуальный референс** | Editorial type-driven layout (журнал/книга), но без декора. Тёплый ночной терминал. |
| **Антиреференс** | Linear, Notion, Things, Stripe Dashboard, любые neon-purple-gradient SaaS. |

---

## 2. Цветовая палитра

База — **тёплый чернильный**, без капли синевы. Глаз ночью не должен ловить холодный спектр.

Все токены живут в [src/styles/globals.css](src/styles/globals.css) как HSL-переменные. **Не вводи hex/rgb прямо в компонентах** — добавляй токен в globals.css и Tailwind config.

```css
--background       25 10% 6%    /* #110F0E   warm ink */
--surface          30 9% 9%     /* #181613   карточный поднимающийся слой */
--surface-2        28 8% 12%    /* #211E1A   hover-state, активная строка */
--foreground       38 36% 92%   /* #F3EDE1   warm cream — основной текст */
--muted-foreground 35 8% 56%    /* #948B7E   вторичный текст, captions */
--faint-foreground 30 6% 35%    /* #5C554C   completed, disabled */
--border           32 12% 14%   /* hairline 1px разделители */
--border-strong    32 10% 22%   /* выделение active-инпута */
--accent           35 50% 60%   /* #D4A85C   CLAY-AMBER. Почти не используется. */
--destructive      14 60% 54%   /* warm coral — ТОЛЬКО для emergency-режима */
```

### Правила использования цвета

- **Один акцент.** `--accent` (warm clay-amber) — это единственный нерейтральный цвет в обычном UI.
- **Где разрешён акцент:** точка-индикатор "due now" в Today, активный пункт в сайдбаре, primary-кнопка нотификации, hover-состояние "→" в quick-actions. И всё.
- **Где акцент запрещён:** заголовки экранов, иконки навигации, статус-бейджи "сделано/пропуск/пропущено", графики (используй muted/foreground оттенки).
- **`--destructive` — только в emergency-режиме** (3 дня без еды, 5 дней без душа). В обычных формах не использовать — даже для confirm-skip кнопки достаточно `border-destructive/40` без заливки.
- **Не вводи новые цвета.** Если кажется, что нужен зелёный для "successful" — это значит ты переусердствовал. `text-foreground` после fade — достаточный сигнал.

---

## 3. Типографика

```
Display  →  Fraunces (variable, opsz 9..144, italic axis)
Body     →  Onest (variable, Cyrillic-friendly, не Inter)
Mono     →  JetBrains Mono (для всего что время/ID/метаданные)
```

Подгружаются из Google Fonts в [index.html](index.html). На потом — упаковка в бандл через `@fontsource-variable`.

### Иерархия

| Роль | Шрифт | Размер | Класс |
|---|---|---|---|
| Display 1 (дата на главном) | Fraunces 60px, tracking -0.025em, leading 0.95 | `text-[60px]` + `font-display` |
| Display 2 (заголовок нотификации) | Fraunces 42px, tracking -0.02em | `text-[42px]` + `font-display` |
| Display italic (день недели, empty states) | Fraunces italic | `font-display italic` |
| Section heading | Mono caps 11px, tracking 0.16em | `.caption` |
| Body | Onest 15px | `text-[15px]` (default) |
| Body small | Onest 13–14px | `text-sm` |
| Mono time | JetBrains Mono 13px, tabular-nums | `font-mono tabular-nums` |
| Status bagde | Mono caps 11px, tracking 0.16em | `font-mono uppercase tracking-[0.16em]` |

### Правила типографики

- **Lowercase везде**, кроме captions (caps + tracking 0.16em). Lowercase читается тише и менее commanding — это часть тона.
- **Точка в конце** в нотификациях ("поесть.", "душ.") — заземляет, делает фразу фактической, не повелительной.
- **Italic — только Fraunces**, и только для: (а) дня недели рядом с датой, (б) empty states, (в) пояснительных приписок ("это уведомление нельзя закрыть...").
- **Никаких bold-заголовков всё-капс**. Все caps — только в captions.
- **Tabular-nums** обязателен везде где число (время, счётчики).

---

## 4. Композиция и spacing

### Сетка

- **Today / страницы-чтения**: `max-w-[640px]`, `px-12 py-16`. Узкая колонка, как книжный столбец, чтобы взгляд скользил вертикально.
- **Сайдбар**: 224px (`w-56`), `px-5 py-7`.
- **Нотификация**: `max-w-[480px]`. Не больше.

### Vertical rhythm

- Между большими секциями: **48–64px** (`space-y-12` / `mb-16`).
- Между caption и контентом: **12–16px** (`mt-3` / `mb-4`).
- Внутри карточки/строки: **12px** (`py-3`).

### Hairlines vs cards

**Этот проект почти не использует cards (`rounded-xl border bg-card`).** Группировка делается тонкими горизонтальными линиями (`border-t border-border/40`) и spacing'ом. Cards добавляют визуальный шум.

| Используй cards | Не используй cards |
|---|---|
| Notification body (есть граница экрана) | Today rows |
| Statistics tiles | Schedule rows |
| Settings sections | Zone rows |

### Asymmetry

Не центрируй контент в большой колонке. Today — left-aligned, max-width ограничен. Это даёт **поля справа** — пространство для дыхания.

---

## 5. Motion (фреймворк решений)

**Базовое правило:** этот пользователь увидит каждый экран десятки раз в день. Анимации, которые радуют один раз — раздражают на сотый.

### Что НЕ анимировать

- Появление списков, секций, карточек на Today/Schedule/Zones/Stats.
- Открытие сайдбар-переключений.
- Hover-состояния (instant — нет `transition` на hover-bg).
- Открытие нотификационного окна в первый кадр (только subtle opacity fade-in, без scale).
- Маркер "active" в сайдбаре (instant color shift).

### Что АНИМИРОВАТЬ

| Действие | Кривая | Длительность |
|---|---|---|
| Button press | `var(--ease-out)` + `scale(0.97)` | 160ms |
| Confirm-skip cross-fade (blur swap) | `var(--ease-out)` + `blur(4px)` + `opacity 0.55` | 220ms |
| Mark complete strike-through | `var(--ease-out)` через `clip-path` | 250ms |
| Notification window opacity fade-in | linear | 200ms |

### Кастомные кривые (живут в globals.css)

```css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);   /* основная для UI */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* для on-screen движения */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* iOS-like для drawers */
```

**Не используй встроенные `ease`, `ease-in-out`, `ease-in`** — они слабые. И **никогда `ease-in` на UI** — он "тормозит" в момент когда пользователь смотрит.

### `prefers-reduced-motion`

Глобально обнуляется в [globals.css](src/styles/globals.css). Не нужно прописывать вручную в каждом компоненте.

---

## 6. Готовые паттерны

### Caption

Маленькая mono-метка. Используй для категорий, дат, любых "tag-like" слов.

```tsx
<div className="caption">сегодня</div>
<div className="caption">еда · 13:00</div>
```

### Dot accent

Единственная декорация. Точка-индикатор "сейчас/active/due".

```tsx
<span aria-hidden className="dot-accent" />
```

### Hairline row

Базовый паттерн для списков (Today, Schedule, Zones).

```tsx
<li className="grid grid-cols-[88px_1fr_auto] items-baseline gap-6 border-t border-border/40 py-3">
  <span className="font-mono tabular-nums text-muted-foreground">13:00</span>
  <span>поесть</span>
  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint-foreground">—</span>
</li>
```

### Blur swap (для смены состояния кнопки)

```tsx
<div className="blur-swap" data-busy={busy}>
  {/* меняющийся контент */}
</div>
```

### Strike-through animation (отметка "сделано")

```tsx
<span className="strikethrough-anim" data-done={completed}>
  {title}
</span>
```

### Tactile button base

Все кнопки, чекбоксы, ссылки автоматически получают `transform: scale(0.97)` на `:active` через глобальный CSS в [globals.css](src/styles/globals.css). Не нужно повторять.

---

## 7. Иконки

- **Сайдбар: без иконок.** Текстовая навигация, dot-индикатор для active.
- **В контенте: Lucide React**, размер 14–16px, `stroke-width: 1.5`. Не толще.
- **В кнопках:** `→` (HTML стрелка) предпочтительнее иконки, если контекст позволяет.
- **Не используй emoji.** Никогда.

---

## 8. Тон копирайтинга

- **Всё lowercase**, кроме сокращений-констант.
- **Точка в конце фраз нотификаций.** "поесть." а не "ПОЕСТЬ".
- **Без восклицаний.** Никаких "!".
- **Без эмоциональной окраски.** "пропустил душ" — нет. "душ — пропуск" — да.
- **Метрики — голые числа.** "0/13 сделано", не "Готово 0 из 13 задач".
- **Время — всегда HH:MM моноширинно.** Не "1 час дня".
- **Empty states — italic Fraunces.** Должны звучать как заметка на полях, не как ошибка.

---

## 9. Чек-лист перед мерджем нового экрана

- [ ] Цвета только из CSS-переменных (нет hex/rgb).
- [ ] Шрифты: Fraunces для display, Onest для body, JetBrains Mono для метаданных. Нет Inter, нет Roboto.
- [ ] Lowercase везде кроме captions.
- [ ] Точка в конце фраз нотификаций / empty states.
- [ ] Cards есть только если экран — это отдельная "поверхность" (notification, stats tile). Иначе hairline rows.
- [ ] Никаких entry-анимаций для повторно-просматриваемого контента.
- [ ] `transform: scale(0.97)` на `:active` на всех кликабельных элементах (через global CSS).
- [ ] tabular-nums на всех числах и временах.
- [ ] Single accent — clay-amber используется не больше чем в 2-3 местах на экране.
- [ ] Empty state есть и звучит как заметка, не как ошибка.
- [ ] Под `prefers-reduced-motion` экран всё ещё работоспособен (это уже в globals.css).
- [ ] Работает в окне 880×560 (наш `minWidth`/`minHeight`).

---

## 10. Источники философии

- **[emil.kowal.ski](https://emil.kowal.ski)** — Emil Kowalski, design engineering. Принципы animation framework, scale(0.97), blur cross-fade, transform-origin для popovers. Скилл `/emil-design-eng` в Claude — кодифицированная версия.
- **Editorial typography** — Werkstatt für Typografie, Dezeen. Высокий display-serif против тихого body, generous vertical rhythm.
- **Дух не-навязчивости** — приложения которые мы хотим помнить и не хотим показывать (личные дневники, command-line tools, terminal-first продукты).

---

## 11. Что менять в этой системе

Можно. Но осторожно.

- **Цветовую базу** — не трогай без обсуждения. Тёплый ночной — это половина характера приложения.
- **Шрифты** — менять можно, но только триадой. Display (выразительный variable serif) + Body (характерный sans с Cyrillic) + Mono. Не вводи Inter "потому что привычно".
- **Motion-длительности** — ужесточать (короче) можно, удлинять — нет.
- **Cards вместо hairlines** — добавлять только когда есть **реальная** граница (отдельное окно, modal, statistic tile). Не из-за того что "так привычнее".
