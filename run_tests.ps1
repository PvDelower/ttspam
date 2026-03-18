# Скрипт для запуска тестов в Docker (Windows PowerShell)

Write-Host "🧪 Запуск тестов Video Automation API..." -ForegroundColor Cyan

# Переходим в директорию проекта
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Собираем образ для тестов
Write-Host "📦 Сборка Docker образа для тестов..." -ForegroundColor Yellow
docker build -f "$projectRoot\backend\Dockerfile.test" -t video-automation-tests "$projectRoot\backend"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка сборки Docker образа" -ForegroundColor Red
    exit 1
}

# Запускаем тесты
Write-Host "🚀 Запуск тестов..." -ForegroundColor Yellow
docker run --rm `
    -v "${projectRoot}\backend:/app" `
    -v "backend-test-storage:/app/storage" `
    video-automation-tests

$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host "✅ Все тесты пройдены!" -ForegroundColor Green
} else {
    Write-Host "❌ Тесты не пройдены (код ошибки: $exitCode)" -ForegroundColor Red
}

exit $exitCode
