# Проект

## Описание

Проект представляет собой веб-приложение с раздельной архитектурой frontend/backend.

## Структура проекта

```
├── backend/          # Серверная часть приложения
├── frontend/         # Клиентская часть приложения
├── docker-compose.yml # Конфигурация Docker Compose
└── Dockerfile.backend1 # Dockerfile для бэкенда
```

## Технологии

- **Backend**: Серверная логика приложения
- **Frontend**: Пользовательский интерфейс
- **Docker**: Контейнеризация приложения

## Запуск проекта

### С помощью Docker Compose

```bash
docker-compose up --build
```

### Отдельный запуск компонентов

1. Запуск бэкенда:
```bash
docker build -f Dockerfile.backend1 -t backend .
docker run -p <port>:<port> backend
```

2. Запуск фронтенда:
```bash
cd frontend
# Следуйте инструкциям в README фронтенда
```

## Требования

- Docker
- Docker Compose

## Лицензия

MIT
