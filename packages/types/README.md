# @bx-fe/e2e-runner-types

Типы для e2e-runner при разработке на typescript.

## Установка

```bash
yarn add @bx-fe/e2e-runner-types --dev
```

## Примеры

```ts
import type { IE2ERunnerConfig } from '@bx-fe/e2e-runner-types';

export default {
  browser: {
    service: 'moon',
    platform: 'desktop',
    name: 'chrome',
  }
} as IE2ERunnerConfig;
```
