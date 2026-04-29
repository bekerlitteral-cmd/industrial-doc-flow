# Установка и сборка

## 1. Системные требования

### Для пользователя (готовый инсталлятор)

| ОС       | Минимум                          |
| -------- | -------------------------------- |
| Windows  | Windows 10 (x64), 200 МБ дискового пространства |
| Linux    | Ubuntu 20.04+ или совместимый, AppImage / .deb |
| macOS    | macOS 11+ (Intel / Apple Silicon) |

### Для разработчика (сборка из исходников)

- Node.js **20+** (рекомендуется LTS) и npm 10+
- Git
- Для нативного модуля `better-sqlite3` нужны C++ build tools:
  - **Linux**: `sudo apt install build-essential libsqlite3-dev python3`
  - **Windows**: установите [Build Tools для VS](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
    или выполните `npm install --global windows-build-tools` (от админа)
  - **macOS**: `xcode-select --install`
- Для кросс-сборки Windows-инсталлятора с Linux: **Wine** (`sudo apt install wine64 wine32`)

## 2. Установка готового инсталлятора

### Windows

1. Скачайте `Industrial Doc Flow-1.0.0-setup.exe` из релизов.
2. Запустите установщик.
3. Выберите каталог установки и нажмите **Установить**.
4. Запустите приложение из меню Пуск или ярлыка на рабочем столе.

При первом запуске Windows SmartScreen может предупредить о неподписанном
приложении (если у вас нет сертификата подписи кода). Нажмите
**Подробнее → Выполнить в любом случае**.

### Linux (AppImage)

```bash
chmod +x Industrial\ Doc\ Flow-1.0.0.AppImage
./Industrial\ Doc\ Flow-1.0.0.AppImage
```

### Linux (.deb)

```bash
sudo dpkg -i industrial-doc-flow_1.0.0_amd64.deb
sudo apt-get install -f
industrial-doc-flow
```

### macOS

1. Скачайте `Industrial Doc Flow-1.0.0.dmg`.
2. Откройте DMG и перетащите приложение в папку Applications.
3. При первом запуске: правый клик → **Открыть** (для обхода Gatekeeper).

## 3. Сборка из исходников

### 3.1. Клонирование

```bash
git clone <repo-url>
cd industrial-doc-flow
```

### 3.2. Установка зависимостей

```bash
npm install
```

Установка автоматически перекомпилирует `better-sqlite3` под версию
Electron (через `electron-builder install-app-deps` в `postinstall`).
Если возникли ошибки компиляции — установите C++ build tools (см. п.1).

### 3.3. Запуск в dev-режиме

```bash
npm run dev
```

Откроется окно Electron с подключённым Vite HMR. Изменения в renderer
применяются на лету; при изменении main/preload приложение перезапускается.

### 3.4. Production-сборка

```bash
npm run build           # компиляция в out/
npm run start           # запуск собранной версии без упаковки
```

### 3.5. Упаковка инсталлятора

```bash
npm run dist            # текущая ОС
npx electron-builder --win --x64    # Windows-инсталлятор
npx electron-builder --linux        # AppImage + .deb
npx electron-builder --mac          # DMG
```

Готовые файлы появятся в каталоге `dist/`.

> **Кросс-сборка Windows с Linux** требует Wine. Установите:
> ```bash
> sudo dpkg --add-architecture i386
> sudo apt update
> sudo apt install wine64 wine32
> ```

## 4. Команды

| Команда                | Описание                                |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | Dev-режим                               |
| `npm run build`        | Сборка в `out/`                         |
| `npm run start`        | Запуск собранной версии                 |
| `npm run typecheck`    | TypeScript-проверка                     |
| `npm run lint`         | ESLint                                  |
| `npm run format`       | Prettier                                |
| `npm run package`      | Сборка без инсталлятора                 |
| `npm run dist`         | Сборка инсталлятора                     |
| `npm run rebuild`      | Перекомпиляция better-sqlite3 (если уехала версия Electron) |

## 5. Структура каталогов после сборки

```
out/
├─ main/index.js          # main-процесс (бандл)
├─ preload/index.js       # preload-скрипт
└─ renderer/
   ├─ index.html
   └─ assets/             # JS/CSS бандл React-приложения
dist/
└─ <платформа-инсталлятор>
```

## 6. Резервное копирование данных

Все данные хранятся в одном файле SQLite. Чтобы сделать backup:

1. Закройте приложение.
2. Скопируйте файл `doc-flow.sqlite` (а также `doc-flow.sqlite-wal` и
   `doc-flow.sqlite-shm`, если они есть) в безопасное место.

Расположение:

- Windows: `%APPDATA%\Industrial Doc Flow\`
- Linux: `~/.config/Industrial Doc Flow/`
- macOS: `~/Library/Application Support/Industrial Doc Flow/`

Восстановление: остановите приложение, верните файл на место.

## 7. Сброс БД

Чтобы сбросить базу к тестовым данным:

1. Закройте приложение.
2. Удалите файл `doc-flow.sqlite` (и сопутствующие `-wal`, `-shm`).
3. Запустите приложение — БД будет создана и наполнена заново.

## 8. Возможные проблемы

| Симптом                                        | Решение                                    |
| ---------------------------------------------- | ------------------------------------------ |
| Ошибка `Cannot find module 'better_sqlite3.node'` | `npm run rebuild` или удалить `node_modules` и заново `npm install` |
| Электрон не запускается на Linux: `chrome-sandbox`| Запускать с `--no-sandbox` или установить `chrome-sandbox` через npm |
| Пустые символы в PDF (квадратики)              | Установите шрифт DejaVu Sans (`fonts-dejavu` на Linux) |
| `electron-builder` не находит wine             | Установите `wine64 wine32` (см. п.1)       |
