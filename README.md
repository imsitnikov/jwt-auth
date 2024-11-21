# JWT Auth

Демо репозиторий auth сервиса.

# Старт приложения

1) `npm ci`

2) После установки зависимостей необходимо пропатчить пакет `@gravity-ui/expresskit` в node_modules, содержимое патча лежит в `node_modules_patches/@gravity-ui/expresskit`. Предполагается что необходимые изменения будут внесены в `@gravity-ui/expresskit`.

2) Настроить postgresql базу данных, применить в ней миграцию из `db.md`.

3) Создать в корне репозитория файл `.env` с содержимым:

```
APP_INSTALLATION=demo
APP_ENV=development
APP_PORT=3001
APP_DEV_MODE=true

UI_APP_ENDPOINT=http://localhost:3000

POSTGRES_DSN_LIST=<строка подключения к базе данных>

ACCESS_TOKEN_PRIVATE_KEY=<приватный rsa ключ для accessToken>
ACCESS_TOKEN_PUBLIC_KEY=<публичный rsa ключ для accessToken>

REFRESH_TOKEN_PRIVATE_KEY=<приватный rsa ключ для refreshToken>
REFRESH_TOKEN_PUBLIC_KEY=<публичный rsa ключ для refreshToken>

SAML_AUTH_ID=saml-1
SAML_AUTH_ENTRY_POINT=<entry point для saml приложения>
SAML_AUTH_CERT=<сертификат saml приложения>
SAML_CALLBACK_PATH=/signin/saml/callback
SAML_ISSUER=passport-saml

LDAP_AUTH_ID=ldap-1
LDAP_AUTH_URL=ldap://localhost:8089
LDAP_AUTH_BIND_DN=<логин админа ldap приложения>
LDAP_AUTH_BIND_CREDENTIALS=<пароль админа ldap приложения>
LDAP_AUTH_SEARCH_BASE='dc=example,dc=org'
LDAP_AUTH_SEARCH_FILTER='(uid={{username}})'
```

4) `npm run dev`