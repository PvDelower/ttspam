"""
Конфигурация и фикстуры для тестов Video Automation API
"""
import os
import sys
import shutil
import tempfile
import pytest
from pathlib import Path

# Добавляем backend в path
sys.path.insert(0, str(Path(__file__).parent.parent))


@pytest.fixture(scope="session")
def test_storage_path():
    """Создание временной директории для тестов"""
    temp_dir = tempfile.mkdtemp(prefix="video_automation_test_")
    
    # Создаем необходимую структуру директорий
    for folder in ["downloads", "outputs", "cache", "banners"]:
        os.makedirs(os.path.join(temp_dir, folder), exist_ok=True)
    
    yield temp_dir
    
    # Очистка после тестов
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def client(test_storage_path):
    """TestClient для FastAPI приложения"""
    from fastapi.testclient import TestClient
    import sys
    import importlib.util
    
    # Переопределяем STORAGE_PATH для тестов
    os.environ['STORAGE_PATH'] = test_storage_path
    
    # Очищаем модули из кэша чтобы использовать новый storage path
    for mod_name in list(sys.modules.keys()):
        if mod_name in ['app', 'processor', 'downloader', 'config']:
            del sys.modules[mod_name]
    
    # Используем importlib для загрузки app.py напрямую
    spec = importlib.util.spec_from_file_location("backend_app", "/app/app.py")
    backend_app = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(backend_app)
    fastapi_app = backend_app.app
    
    # Не используем root_path - тесты должны использовать полные пути
    with TestClient(fastapi_app) as test_client:
        yield test_client


@pytest.fixture
def sample_video_file(test_storage_path):
    """Создание тестового видео файла"""
    downloads_dir = os.path.join(test_storage_path, "downloads")
    video_path = os.path.join(downloads_dir, "test_video.mp4")
    
    # Создаем простое тестовое видео через FFmpeg
    import subprocess
    cmd = [
        "ffmpeg",
        "-f", "lavfi",
        "-i", "testsrc=duration=5:size=320x240:rate=30",
        "-f", "lavfi",
        "-i", "sine=frequency=440:duration=5",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-shortest",
        "-y",
        video_path
    ]
    subprocess.run(cmd, capture_output=True, timeout=30)
    
    return video_path


@pytest.fixture
def sample_banner_file(test_storage_path):
    """Создание тестового баннера (GIF)"""
    banners_dir = os.path.join(test_storage_path, "banners")
    banner_path = os.path.join(banners_dir, "test_banner.gif")
    
    # Создаем простой тестовый GIF через FFmpeg
    import subprocess
    cmd = [
        "ffmpeg",
        "-f", "lavfi",
        "-i", "color=c=red:duration=2:size=200x100:rate=10",
        "-f", "lavfi",
        "-i", "color=c=blue:duration=2:size=200x100:rate=10",
        "-filter_complex",
        "[0:v][1:v]concat=n=2:v=1:a=0[v];[v]split[a][b];[a]palettegen[p];[b][p]paletteuse",
        "-y",
        banner_path
    ]
    subprocess.run(cmd, capture_output=True, timeout=30)
    
    return banner_path


@pytest.fixture
def mock_youtube_url():
    """Mock YouTube URL для тестов"""
    return "https://www.youtube.com/watch?v=jNQXAC9IVRw"  # Первое видео на YouTube


@pytest.fixture
def valid_video_process_request():
    """Валидный запрос на обработку видео"""
    return {
        "input_filename": "test_video.mp4",
        "effects": ["brightness"],
        "resize": {"width": 1080, "height": 1920}
    }


@pytest.fixture
def valid_trim_request():
    """Валидный запрос на обрезку видео"""
    return {
        "input_filename": "test_video.mp4",
        "start_time": 0,
        "end_time": 10
    }


@pytest.fixture
def valid_schedule_request():
    """Валидный запрос на планирование"""
    from datetime import datetime, timedelta
    future_time = datetime.now() + timedelta(hours=1)
    return {
        "video_filename": "test_video.mp4",
        "caption": "Test caption for TikTok",
        "schedule_time": future_time.isoformat()
    }
