# @bx-fe/e2e-runner-app

## Установка

```bash
yarn add @bx-fe/e2e-runner-app @wdio/mocha-framework --dev
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

Для тестов на typescript необходимо добавить типы в поле types в tsconfig.json:

```json
{
  "compilerOptions": {
    "types": [
      "wdio-image-comparison-service"
    ]
  }
}
```

## Настройка

### outputDir

Корневая папка, относительно которой будут складываться файлы всех остальных модулей.

Type: `string | undefined`<br>
Default: `.e2e-runner`

### reportsOutputDir

Папка, в которой будут храниться отчеты по всем запущенным `suite` в текущей сессии. Данные отчеты нужны 
для последующей передачи их в *slack*.

Type: `string | undefined`<br>
Default: `reports`

### baseUrl

`baseUrl` для команды `browser.url`. Аналогичен [wdio](https://webdriver.io/docs/options/#baseurl).

Type: `string | undefined`<br>
Default: `http://localhost:8080`

### launchName

Имя сессии для указания в отчетах *allure*.

Type: `string | undefined`<br>
Default: `CI_JOB_URL - в ci, иначе - имя компьютера, на котором запускается тест-раннер`

### suite

Набор тестов, зарегистрированный в [suites](#suites), который необходимо запустить в текущей сессии. 
Если не передать, то будут запущены все `suites`.

Type: `string | undefined`

### suites

Наборы тестов доступные для запуска. Для всякого набора можно указать ответственную команду в ключе `slackGroupId`. 
Если не указывать, ответственной будет считаться группа пользователей, указанных в ключе `defaultUsers` 
настроек модуля [slack](#slack).

Type: `Record<string, ISuiteConfig>`

### browser

Объект, описывающий, в каком браузере необходимо запустить тесты в текущей сессии.

На выбор доступно 3 сервиса, в каждом из которых есть свой набор браузеров:

* driver - пакет `chromedriver`, предоставляющий браузер `chrome`
* browserstack - сервис облачного тестирования, предоставляющий браузеры
  `chrome`, `edge`, `firefox`, `ie`, `safari`. При использовании этого сервиса можно настроить подключение в
  опции [browserstack](#browserstack)
* moon - сервис авто-тестирования работающий в кластере Kubernetes, предоставляющий браузеры
  `chrome`, `edge`, `firefox`, `opera`, `safari`. При использовании этого сервиса можно настроить подключение в
  опции [moon](#moon)

Type: `IBrowserConfig`

### capabilities

Массив дополнительно настроенных вами браузеров, в которых можно будет запускать тесты.

Type: `ICapability[] | undefined`

В зависимости от сервиса, для которого вы хотите настроить браузер, вам придется импортировать соответствующий класс. На
выбор доступны три класса:

* `BrowserstackCapability`,
* `DriverCapability`
* `MoonCapability`

Далее экземпляр класса необходимо добавить в массив `capabilities`:

```ts
import { BrowserstackCapability } from '@bx-fe/e2e-runner-app';

export default {
  browser: {
    service: 'browserstack',
    platform: 'desktop',
    name: 'chrome'
  },
  capabilities: [
    new BrowserstackCapability(
      'desktop', {
        browserName: 'chrome',
        browserVersion: '91.3',
        'goog:chromeOptions': {
          args: [
            '--headless',
            '--incognito',
            '--disable-notifications',
            '--disable-extensions',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-infobars',
          ],
        },
        'bstack:options': {
          os: 'Windows',
          osVersion: '10',
          resolution: '1440x900',
        }
      }
    ),
  ]
}
```

### allure

Настройка модуля для отправки отчетов.

Type: `IAllureConfig | undefined`

### allure.url

Адрес сервера отчетов *allure*.

Type: `string | undefined`<br>
Default: `https://allure.o3.ru`

### allure.projectId

`id` вашего проекта в *allure*

Type: `string`

### allure.token

`token` авторизации в *allure*

Type: `string | undefined`<br>
Default: `99682e5e-9a4c-403d-bc30-707608caa700`

### allure.options

Опции [сервиса](https://webdriver.io/docs/allure-reporter#configuration) *allure* для *wdio* 
используемого под капотом.

Type: `AllureReporterOptions | undefined`

### screenshots

Настройка модуля для управления скриншотами.

Type: `IScreenshotsConfig | undefined`

### screenshots.suites

Наборы, для которых необходимо скачивать baseline скриншоты.

Type: `(string | RegExp)[] | undefined`

### screenshots.ciJobs

Джобы, которые необходимо перезапускать после апрува новой версии скриншотов.

Type: `(string | RegExp)[] | undefined`

### screenshots.s3

Настройка модуля хранилища s3

Type: `IS3Config`<br>

### screenshots.s3.bucket

Имя `bucket`, в котором будут выполняться все операции.

Type: `string`<br>

### screenshots.s3.accessKey

`accessKey` для авторизации в s3

Type: `string`<br>

### screenshots.s3.secretKey

`secretKey` для авторизации в s3

Type: `string`<br>

### screenshots.s3.host

Адрес, по которому происходит подключение к хранилищу.

Type: `string`<br>
Default: `prod.s3.ceph.s.o3.ru`

### screenshots.s3.port

Порт, по которому происходит подключение к хранилищу.

Type: `number`<br>
Default: `7480`

### screenshots.gitlab

Настройка модуля использующего Gitlab API

Type: `IGitlabConfig`<br>

### screenshots.gitlab.projectId

`id` проекта в gitlab

Type: `string`<br>

### screenshots.gitlab.token

`token` разрешающий чтение и запись в gitlab

Type: `string`<br>

### screenshots.comparison

Расширенные настройки [сервиса](https://webdriver.io/docs/wdio-image-comparison-service) скриншот-тестирования для wdio,
используемого под капотом.

Type: `IScreenshotComparisonOptions | undefined`

### screenshots.comparison.formatSuiteDirName

Строка, использующая шаблоны, для составления уникального имени папки скриншотов для каждого suite.
Доступные шаблоны: `suite`, `service`, `browser`, `platform`.

Type: `string | undefined`
Default: `{suite}-{service}-{browser}-{platform}`

### screenshots.comparison.actualFolder

Имя папки, в которой будут храниться скриншоты, сделанные в рамках текущей сессии.

Type: `string | undefined`
Default: `actual`

### screenshots.comparison.diffFolder

Имя папки, в которой будут храниться скриншоты, показывающие различия между актуальным и эталонным скриншотами.

Type: `string | undefined`
Default: `diff`

### slack

Настройка модуля для отправки отчетов и оповещений о ходе тестирования в slack.

Type: `ISlackConfdig`

### slack.channelId

Имя канала в *slack*, куда был добавлен slack-бот *e2e-runner*

Type: `string`

### slack.defaultUsers

Группа пользователей, которые будут призваны в случае падения тестов, у которых не указана ответственная 
команда.

Type: `ISlackUser[]`

### slack.groups

Данные групп пользователей, причастных к проекту, и среди которых необходимо осуществлять поиск 
ответственных.

Type: `ISlackGroup[]`

### typescript

Включение поддержки алиасов при использовании typescript.<br>
Если передать `true`, то настройки будут браться из `tsconfig.json` в корне проекта.

Type: `boolean | ITypescriptConfig | undefined`

### typescript.baseUrl

`baseUrl` для добавляемых алиасов. Аналогичен настройке из [typescript](https://www.typescriptlang.org/tsconfig#baseUrl)

Type: `string`

### typescript.paths

Алиасы относительно [baseUrl](#typescript-baseUrl). Аналогичен настройке
из [typescript](https://www.typescriptlang.org/tsconfig#paths)

Type: `Record<string, string[]>`

### browserstack

Настройки для подключения к сервису [browserstack](https://www.browserstack.com/).

Type: `IBrowserstackConfig | undefined`

### browserstack.user

Логин для подключения к сервису [browserstack](https://www.browserstack.com/).

Type: `string | undefined`<br>
Default: `allahverdievazad1`

### browserstack.key

Пароль для подключения к сервису [browserstack](https://www.browserstack.com/).

Type: `string | undefined`<br>
Default: `ZggEvtHKVd3sTmb3CB13`

### moon

Настройки для подключения к сервису [moon](https://aerokube.com/moon/latest/).

Type: `IMoonConfig | undefined`

### moon.host

Адрес, на котором поднят сервис [moon](https://aerokube.com/moon/latest/).

Type: `string | undefined`<br>
Default: `moon.moon.infra-ts.s.o3.ru`

### moon.port

Порт, на котором поднят сервис [moon](https://aerokube.com/moon/latest/).

Type: `number | undefined`<br>
Default: `80`

### moon.path

Путь, по которому поднят сервис [moon](https://aerokube.com/moon/latest/).

Type: `string | undefined`<br>
Default: `/wd/hub`

### wdioConfigExtend

Модифицирование [wdio конфига](https://webdriver.io/docs/options) напрямую. Здесь вы можете изменить те настройки,
которые не были вынесены в корень конфига.

Type: `((config: TWdioConfig) => void) | undefined`

## Написание тестов

Тесты пишутся на базе фреймворков [Mocha](https://mochajs.org/) и [WebdriverIO](https://webdriver.io/), а также, при
включении скриншот тестирования, на базе
модуля [ImagComparison](https://webdriver.io/docs/wdio-image-comparison-service#writing-tests)

Для создания отчетов о прохождение теста используется
модуль [AllureReporter](https://webdriver.io/docs/allure-reporter#supported-allure-api), который вы можете импортировать
из данного пакета при необходимости:

```ts
import { AllureReporter } from '@bx-fe/e2e-runner-app';

describe('screenshot', function () {
  it(`should compare successful with a baseline`, () => {
    const path = `/__tests__/OzButton/0/`;

    AllureReporter.startStep(`Going to scenario url ${path}`);
    browser.url(path);
    AllureReporter.endStep();
  });
});
```
