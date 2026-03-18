#!/bin/bash

# Скрипт для запуска тестов в Docker

echo "🧪 Запуск тестов Video Automation API..."

# Собираем образ для тестов
docker build -f backend/Dockerfile.test -t video-automation-tests ./backend

# Запускаем тесты
docker run --rm \
    -v $(pwd)/backend:/app \
    -v backend-test-storage:/app/storage \
    video-automation-tests

echo "✅ Тесты завершены"
