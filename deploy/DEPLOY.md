# Деплой CodeGym на Yandex Cloud

## 1. Создать VPS

Яндекс Облако → Compute Cloud → Создать ВМ:

- **Образ:** Ubuntu 22.04
- **vCPU:** 2 (guaranteed), RAM: 2 GB — хватит с запасом
- **Диск:** 15 GB SSD
- **Публичный IP:** да (статический)
- **SSH-ключ:** добавить свой `~/.ssh/id_rsa.pub`

Стоимость: ~500-700 р/мес.

## 2. Настроить сервер

```bash
# С локальной машины:
ssh root@<VPS_IP> 'bash -s' < deploy/setup-server.sh
```

Установит: Node.js 20, SQLite, Nginx, AWS CLI, создаст пользователя `codegym`.

## 3. Первый деплой

```bash
# С локальной машины:
./deploy/deploy.sh <VPS_IP>
```

Что делает скрипт:

1. `npm run build` — собирает фронт + бандлит сервер
2. Загружает `dist/`, `server-bundle.mjs`, миграции на VPS
3. Устанавливает нативные зависимости (`better-sqlite3`)
4. Генерирует `.env` с рандомным `JWT_SECRET`
5. Регистрирует systemd-сервисы (приложение + бэкап-таймер)

Приложение доступно: `http://<VPS_IP>:3001`

## 4. Создать БД и seed

```bash
ssh root@<VPS_IP>

# На VPS:
cd /opt/codegym
sudo -u codegym node server-bundle.mjs &  # запустит миграции автоматически
# Ctrl+C

# Или seed с данными:
sudo -u codegym npx tsx server/db/seed.ts  # если нужны тестовые данные
```

## 5. Настроить домен + HTTPS (опционально)

Если есть домен:

1. Добавить A-запись: `codegym.example.com → <VPS_IP>`
2. На VPS:

```bash
bash /opt/codegym/deploy/setup-nginx.sh codegym.example.com
```

Без домена — приложение работает по `http://<VPS_IP>:3001`.

## 6. Настроить бэкапы в S3

### 6a. Создать бакет Yandex Object Storage

Яндекс Облако → Object Storage → Создать бакет:

- Имя: `codegym-backups`
- Доступ: приватный

Создать сервисный аккаунт с ролью `storage.editor`, получить ключи.

### 6b. Настроить AWS CLI на VPS

```bash
ssh root@<VPS_IP>

sudo -u codegym aws configure
# AWS Access Key ID: <ключ от Яндекса>
# AWS Secret Access Key: <секрет от Яндекса>
# Region: ru-central1
# Output: json
```

### 6c. Прописать бакет в .env

```bash
# На VPS:
nano /opt/codegym/.env
# Добавить:
S3_BUCKET=s3://codegym-backups/db
S3_ENDPOINT=https://storage.yandexcloud.net
```

Бэкапы уже настроены (systemd timer каждые 15 минут).

Проверить:

```bash
systemctl status codegym-backup.timer
sudo -u codegym /opt/codegym/deploy/backup.sh  # ручной бэкап
```

## 7. Восстановление из бэкапа

```bash
# Последний локальный:
sudo -u codegym /opt/codegym/deploy/restore.sh

# Конкретный файл:
sudo -u codegym /opt/codegym/deploy/restore.sh codegym-20260329-120000.db

# Из S3:
sudo -u codegym /opt/codegym/deploy/restore.sh s3
```

## Последующие деплои

```bash
# С локальной машины — одна команда:
./deploy/deploy.sh <VPS_IP>
```

Скрипт пересоберёт, загрузит и перезапустит сервис.

## Полезные команды

```bash
# Статус
ssh root@<VPS_IP> systemctl status codegym

# Логи (live)
ssh root@<VPS_IP> journalctl -u codegym -f

# Перезапуск
ssh root@<VPS_IP> systemctl restart codegym

# Ручной бэкап
ssh root@<VPS_IP> sudo -u codegym /opt/codegym/deploy/backup.sh

# Список бэкапов
ssh root@<VPS_IP> ls -lh /opt/codegym/backups/
```

## Архитектура на VPS

```
Internet → Nginx (:80/:443) → Hono (:3001) → SQLite (data/codegym.db)
                                    ↓
                              dist/ (static frontend)

systemd timer (15 мин) → backup.sh → SQLite .backup → S3
```
