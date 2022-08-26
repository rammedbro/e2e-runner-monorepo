# @bx-fe/e2e-runner-cli

Интерфейс командной строки для управления различными модулями e2e-runner.

## Установка

```bash
yarn add @bx-fe/e2e-runner-cli @wdio/mocha-framework --dev
```

Для тестов на typescript также необходимо добавить типы в поле `types` в tsconfig.json:

```json
{
  "compilerOptions": {
    "types": [
      "@wdio/mocha-framework",
      "expect-webdriverio"
    ]
  }
}
```

### Дополнительные модули

#### Синхронный код в тестах

```bash
yarn add @wdio/sync --dev
```

Для тестов на typescript также необходимо добавить типы в поле types в tsconfig.json:

```json
{
  "compilerOptions": {
    "types": [
      "webdriverio/sync"
    ]
  }
}
```

#### Модуль для скриншот-тестирования

```bash
yarn add wdio-image-comparison-service --dev
```

Для тестов на typescript также необходимо добавить типы в поле types в tsconfig.json:

```json
{
  "compilerOptions": {
    "types": [
      "wdio-image-comparison-service"
    ]
  }
}
```

## Использование

```bash
e2e-runner [options] <command>
```

## Опции

* `-v, --version` - версия программы
* `-c, --config <path>` - путь к конфиг файлу, по умолчанию ищет конфиг в папке выполнения программы
* `-h, --help` - помощь

## Команды

### run

Запуск тест-раннера.

**Использование**:

```bash
e2e-runner run
```

**Примеры**:

```bash
e2e-runner run
```

### allure generate

Собрать локальный отчет в allure на основе выполненных тестов.

**Использование**:

```bash
e2e-runner allure generate [options] [resultsPath]
```

**Аргументы**:

* `resultsPath` - путь к отчетам по тестам, на основе которых будет составлен отчет allure. Если не передать, 
то будет искать папку `allure-results` в папках `allure.options.outputDir` и `outputDir` конфиг файла.

**Опции**:

* `-o, --output` - путь, по которому сохранить отчеты allure. Если не передать, то будет взят путь из опции
`outputDir` конфиг файла.
* `--clean` - удалить предыдущий отчет allure, если он существует
* `-h, --help` - помощь

**Примеры**:
```bash
e2e-runner allure generate 
e2e-runner allure generate dist/allure-results
e2e-runner allure generate dist/allure-results -o dist/allure-reports
e2e-runner allure generate dist/allure-results -o dist/allure-reports --clean
```

### allure open

Собрать локальный отчет в allure на основе выполненых тестов.

**Использование**:

```bash
e2e-runner allure open [options] [reportPath]
```

**Аргументы**:

* `reportPath` - путь к отчетам allure. Если не передать, то будет искать папку `allure-report` в папке `outputDir` 
конфиг файла.

**Опции**:

* `-h, --help` - помощь

**Примеры**:

```bash
e2e-runner allure open 
e2e-runner allure open dist/allure-report
```

### screenshots pull

Скачивание скриншотов из s3 хранилища. Предназначен только для работы в пайплайне.

**Использование**:

```bash
e2e-runner screenshots pull [options]
```

**Опции**:

* `-h, --help` - помощь

**Примеры**:

```bash
e2e-runner screenshots pull
```

### screenshots push

Загрузка скриншотов в s3 хранилище. Предназначен только для работы в пайплайне.

**Использование**:

```bash
e2e-runner screenshots push [options]
```

**Опции**:

* `-h, --help` - помощь

**Примеры**:

```bash
e2e-runner screenshots push
```

### screenshots merge

Слияние скриншотов из release ветки в ветку master в s3 хранилище. Предназначен только для работы в пайплайне.

**Использование**:

```bash
e2e-runner screenshots merge [options]
```

**Опции**:

* `-h, --help` - помощь

**Примеры**:

```bash
e2e-runner screenshots merge
```

### screenshots report

Отправка отчета о скриншоте тестирование в slack. Предназначен только для работы в пайплайне.

**Использование**:

```bash
e2e-runner screenshots report [options]
```

**Опции**:

* `-h, --help` - помощь

**Примеры**:

```bash
e2e-runner screenshots report
```

### s3

Запуск интерактивного скачивания файлов из s3 хранилища.

**Использование**:

```bash
e2e-runner s3 [options]
```

**Опции**:

* `-h, --help` - помощь

**Примеры**:

```bash
e2e-runner s3
```

### compare-app build

Запуск интерактивного сборщика статического сайта со сравнением скриншотов.

**Использование**:

```bash
e2e-runner compare-app build [options]
```

**Опции**:

* `-h, --help` - помощь

**Примеры**:

```bash
e2e-runner compare-app build
```
