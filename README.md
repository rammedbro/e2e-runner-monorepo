# @bx-fe/e2e-runner

## Пакеты

| Проект                 | Пакет                                                                                                         | Readme                                                                         |
|------------------------|---------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| **E2E Runner App**     | [`@bx-fe/e2e-runner-app`](https://nexus.s.o3.ru/#browse/browse:npm-private:%40bx-fe%2Fe2e-runner-app)         | [![README](https://img.shields.io/badge/README--green.svg)](/packages/app)     |
| **E2E Runner Cli**     | [`@bx-fe/e2e-runner-cli`](https://nexus.s.o3.ru/#browse/browse:npm-private:%40bx-fe%2Fe2e-runner-cli)         | [![README](https://img.shields.io/badge/README--green.svg)](/packages/cli)     |
| **E2E Runner Types**   | [`@bx-fe/e2e-runner-types`](https://nexus.s.o3.ru/#browse/browse:npm-private:%40bx-fe%2Fe2e-runner-types)     | [![README](https://img.shields.io/badge/README--green.svg)](/packages/types)   |
| **E2E Runner Compare** | [`@bx-fe/e2e-runner-compare`](https://nexus.s.o3.ru/#browse/browse:npm-private:%40bx-fe%2Fe2e-runner-compare) | [![README](https://img.shields.io/badge/README--green.svg)](/packages/compare) |

## Разработка

### Особенности

Сборка с помощью `rollup` осуществляется таким образом, что всякий пакет может предоставить свой 
конфиг файл, который будет расширять базовый конфиг. Данный конфиг файл должен экспортировать 
по умолчанию массив объектов с ключами:
* `name` - уникальное, в рамках пакета, имя конфига
* `options` - объект настроек сборки
* `config` - сам rollup конфиг

Возможные опции, которые можно передать в объекте `options`:
* `types` - собрать ли типы для данного бандла. По умолчанию - `true`

### Установка

```bash
yarn install
yarn lerna:bootstrap
```

### Сборка

Сборка пакетов выполняется командами:
* `yarn build [packages]` - сборка пакетов с возможностью указания их через пробел, 
а их конфигов через cлэш. Если не указать, то будут собраны все пакеты.
* `yarn build:cli:packages` - интерактивный выбор пакетов
* `yarn build:cli:configs` - интерактивный выбор конфигов внутри пакетов

**Важно!** При инициализации проекта необходимо выполнить сборку всех пакетов.

### Модульное тестирование

#### Запуск

Запуск модульных тестов выполняется командами:
* `yarn test:all` - все тесты
* `yarn test:changed` - тесты только для измененных файлов

#### Покрытие

Получение информации о покрытие выполняется командой `yarn test:coverage`, после чего:
* в консоли будет выведен суммарный отчет
* в папку `dist/unit/coverage/lcov-report` будет добавлен подробный отчет

### Интеграционное тестирование

#### Требования

* Ветка должна иметь имя по шаблону `dev/<TASK_ID>`
* Коммиты должны иметь `id` задачи по шаблону `[<TASK_ID>] message`
* Ветка должна содержать коммиты только одной задачи

#### Публикация

В пайплайне для `dev` веток на стадии *publish* запускаем джобу **publish-rc**. Она опубликует каждый пакет 
в группе `@bx-fe` с именем по шаблону `<PACKAGE_NAME>-<TASK_ID>` и выведет ссылки на них в детальном отчете.

Для новых изменений необходимо всякий раз запускать джобу **publish-rc**, которая будет публиковать новую
версию пакета с вашими изменениями. Впоследствии все версии удалятся в джобе **unpublish-rc** 
в пайплайне для ветки master.

#### Тестирование

Добавляем в необходимый проект опубликованные пакеты командой:<br>
`yarn add @bx-fe/<PACKAGE_NAME>@npm:@bx-fe/<PACKAGE_NAME>-<TASK_ID>`.

### Обновление версии

```bash
yarn version:up
```

После чего в консоли будет запущен интерактивный помощник, который предложит обновить версии 
необходимых пакетов и затем автоматически сделает коммит с этими изменениями.
