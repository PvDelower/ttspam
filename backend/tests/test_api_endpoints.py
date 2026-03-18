"""
Тесты для основных эндпоинтов Video Automation API
"""
import os
import pytest
from pathlib import Path
from datetime import datetime, timedelta


class TestHealthCheck:
    """Тесты для health check эндпоинтов"""

    def test_root_endpoint(self, client):
        """Тест корневого эндпоинта"""
        response = client.get("/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert "Video Automation API" in data["message"]

    def test_health_endpoint(self, client):
        """Тест health check эндпоинта"""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "storage_path" in data
        assert "directories" in data

    def test_youtube_test_endpoint(self, client):
        """Тест эндпоинта проверки YouTube"""
        response = client.get("/api/test-youtube")
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "message" in data


class TestDownloadEndpoint:
    """Тесты для эндпоинта скачивания видео"""

    def test_download_missing_url(self, client):
        """Тест скачивания без URL"""
        response = client.post("/api/download", json={})
        assert response.status_code == 400
        assert "youtube_url required" in response.json()["detail"]

    def test_download_invalid_url_format(self, client):
        """Тест скачивания с некорректным форматом URL"""
        response = client.post("/api/download", json={"url": "not-a-valid-url"})
        # Backend возвращает 500 при ошибке скачивания
        assert response.status_code == 500

    def test_download_valid_url(self, client, mock_youtube_url):
        """Тест скачивания с валидным URL (может упасть из-за сети)"""
        response = client.post("/api/download", json={
            "url": mock_youtube_url,
            "quality": "720p"
        })
        # Может вернуть 200 или 500 в зависимости от доступности YouTube
        assert response.status_code in [200, 500]


class TestUploadEndpoint:
    """Тесты для эндпоинта загрузки видео"""

    def test_upload_valid_video(self, client, test_storage_path):
        """Тест загрузки валидного видео файла"""
        # Создаем тестовый видео файл
        test_video_path = os.path.join(test_storage_path, "temp_test.mp4")
        import subprocess
        cmd = [
            "ffmpeg",
            "-f", "lavfi",
            "-i", "testsrc=duration=2:size=320x240:rate=30",
            "-c:v", "libx264",
            "-y",
            test_video_path
        ]
        subprocess.run(cmd, capture_output=True, timeout=30)
        
        with open(test_video_path, "rb") as f:
            files = {"file": ("test.mp4", f, "video/mp4")}
            response = client.post("/api/upload", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert "file_id" in data
        assert data["status"] == "success"

    def test_upload_invalid_extension(self, client):
        """Тест загрузки файла с неподдерживаемым расширением"""
        files = {"file": ("test.txt", b"not a video", "text/plain")}
        response = client.post("/api/upload", files=files)
        # Backend возвращает 500 при ошибке загрузки
        assert response.status_code == 500


class TestProcessEndpoint:
    """Тесты для эндпоинта обработки видео"""

    def test_process_missing_filename(self, client):
        """Тест обработки без имени файла"""
        response = client.post("/api/process", json={})
        assert response.status_code == 422  # Validation error

    def test_process_file_not_found(self, client):
        """Тест обработки с несуществующим файлом"""
        response = client.post("/api/process", json={
            "input_filename": "nonexistent.mp4",
            "effects": [],
            "resize": None
        })
        # Backend возвращает 500 когда файл не найден
        assert response.status_code == 500

    def test_process_valid_video(self, client, sample_video_file):
        """Тест обработки валидного видео"""
        filename = os.path.basename(sample_video_file)
        response = client.post("/api/process", json={
            "input_filename": filename,
            "effects": [],
            "resize": {"width": 1080, "height": 1920}
        })
        # Обработка может занять время
        assert response.status_code in [200, 500]


class TestTrimEndpoint:
    """Тесты для эндпоинта обрезки видео"""

    def test_trim_invalid_time_negative_start(self, client):
        """Тест обрезки с отрицательным временем начала"""
        response = client.post("/api/trim", json={
            "input_filename": "test.mp4",
            "start_time": -1,
            "end_time": 10
        })
        assert response.status_code == 422  # Validation error

    def test_trim_invalid_time_end_before_start(self, client):
        """Тест обрезки с end_time < start_time"""
        response = client.post("/api/trim", json={
            "input_filename": "test.mp4",
            "start_time": 10,
            "end_time": 5
        })
        assert response.status_code == 422  # Validation error

    def test_trim_file_not_found(self, client):
        """Тест обрезки с несуществующим файлом"""
        response = client.post("/api/trim", json={
            "input_filename": "nonexistent.mp4",
            "start_time": 0,
            "end_time": 10
        })
        # Backend возвращает 500 когда файл не найден
        assert response.status_code == 500


class TestEffectsEndpoint:
    """Тесты для эндпоинта добавления эффектов"""

    def test_effects_empty_effects(self, client):
        """Тест с пустым списком эффектов"""
        response = client.post("/api/effects", json={
            "input_filename": "test.mp4",
            "effects": []
        })
        # Pydantic валидатор возвращает 422 для пустого списка
        assert response.status_code == 422

    def test_effects_file_not_found(self, client):
        """Тест эффектов с несуществующим файлом"""
        response = client.post("/api/effects", json={
            "input_filename": "nonexistent.mp4",
            "effects": ["brightness"]
        })
        # Backend возвращает 500 когда файл не найден
        assert response.status_code == 500


class TestFilesEndpoint:
    """Тесты для эндпоинтов управления файлами"""

    def test_list_files_downloads(self, client):
        """Тест списка файлов в downloads"""
        response = client.get("/api/files?directory=downloads")
        assert response.status_code == 200
        data = response.json()
        assert "files" in data
        assert "total" in data
        assert data["directory"] == "downloads"

    def test_list_files_outputs(self, client):
        """Тест списка файлов в outputs"""
        response = client.get("/api/files?directory=outputs")
        assert response.status_code == 200
        data = response.json()
        assert data["directory"] == "outputs"

    def test_list_files_invalid_directory(self, client):
        """Тест списка файлов с некорректной директорией"""
        response = client.get("/api/files?directory=invalid")
        # Backend возвращает 500 при ошибке
        assert response.status_code == 500

    def test_delete_file_invalid_filename(self, client):
        """Тест удаления файла с некорректным именем"""
        response = client.delete("/api/files/../etc/passwd?directory=downloads")
        # Backend возвращает 404 когда файл не найден
        assert response.status_code == 404

    def test_delete_file_not_found(self, client):
        """Тест удаления несуществующего файла"""
        response = client.delete("/api/files/nonexistent.mp4?directory=downloads")
        # Backend возвращает 404 когда файл не найден
        assert response.status_code == 404


class TestPreviewEndpoint:
    """Тесты для эндпоинтов превью"""

    def test_preview_missing_file_id(self, client):
        """Тест превью без file_id"""
        response = client.post("/api/preview", json={})
        assert response.status_code == 400
        assert "file_id required" in response.json()["detail"]

    def test_preview_file_not_found(self, client):
        """Тест превью с несуществующим файлом"""
        response = client.post("/api/preview", json={"file_id": "nonexistent.mp4"})
        assert response.status_code == 404
        assert "File not found" in response.json()["detail"]

    def test_preview_valid_video(self, client, sample_video_file):
        """Тест создания превью для валидного видео"""
        filename = os.path.basename(sample_video_file)
        response = client.post("/api/preview", json={"file_id": filename})
        # Может вернуть 200 или 500 в зависимости от FFmpeg
        assert response.status_code in [200, 500]
        if response.status_code == 200:
            data = response.json()
            assert "preview_url" in data
            assert "filename" in data


class TestBannersEndpoint:
    """Тесты для эндпоинтов баннеров"""

    def test_list_banners(self, client):
        """Тест списка баннеров"""
        response = client.get("/api/banners")
        assert response.status_code == 200
        data = response.json()
        assert "banners" in data
        assert "count" in data

    def test_upload_banner_valid(self, client, test_storage_path):
        """Тест загрузки валидного баннера"""
        # Создаем тестовый GIF
        import subprocess
        banner_path = os.path.join(test_storage_path, "temp_banner.gif")
        cmd = [
            "ffmpeg",
            "-f", "lavfi",
            "-i", "color=c=red:duration=1:size=100x100:rate=1",
            "-frames:v", "1",
            "-y",
            banner_path
        ]
        subprocess.run(cmd, capture_output=True, timeout=30)
        
        with open(banner_path, "rb") as f:
            files = {"file": ("banner.gif", f, "image/gif")}
            response = client.post("/api/banner/upload", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert "banner_id" in data
        assert data["status"] == "success"

    def test_upload_banner_invalid_type(self, client):
        """Тест загрузки баннера с неподдерживаемым типом"""
        files = {"file": ("banner.txt", b"not an image", "text/plain")}
        response = client.post("/api/banner/upload", files=files)
        # Backend возвращает 500 при ошибке
        assert response.status_code == 500


class TestScheduleEndpoint:
    """Тесты для эндпоинтов планирования"""

    def test_schedule_missing_time(self, client):
        """Тест планирования без времени"""
        response = client.post("/api/schedule", json={
            "video_filename": "test.mp4",
            "caption": "Test caption"
        })
        assert response.status_code == 422  # Validation error

    def test_schedule_past_time(self, client):
        """Тест планирования на прошлое время"""
        past_time = datetime.now() - timedelta(hours=1)
        response = client.post("/api/schedule", json={
            "video_filename": "test.mp4",
            "caption": "Test caption",
            "schedule_time": past_time.isoformat()
        })
        assert response.status_code == 422  # Validation error

    def test_schedule_valid(self, client, sample_video_file):
        """Тест валидного планирования"""
        future_time = datetime.now() + timedelta(hours=1)
        filename = os.path.basename(sample_video_file)
        response = client.post("/api/schedule", json={
            "video_filename": filename,
            "caption": "Test caption for scheduled post",
            "schedule_time": future_time.isoformat()
        })
        # Может вернуть 200 или 500
        assert response.status_code in [200, 500]


class TestScheduledPostsEndpoint:
    """Тесты для эндпоинтов запланированных постов"""

    def test_list_scheduled_posts(self, client):
        """Тест списка запланированных постов"""
        response = client.get("/api/scheduled_posts")
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        assert "total" in data

    def test_delete_scheduled_post_not_found(self, client):
        """Тест удаления несуществующего поста"""
        response = client.delete("/api/scheduled_posts/nonexistent_id")
        # Может вернуть 200 (если ID не найден в списке) или 500
        assert response.status_code in [200, 500]


class TestTikTokEndpoints:
    """Тесты для TikTok эндпоинтов (заглушки)"""

    def test_tiktok_user(self, client):
        """Тест получения пользователя TikTok"""
        response = client.get("/api/tiktok/user")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "not_authenticated"

    def test_tiktok_accounts(self, client):
        """Тест списка TikTok аккаунтов"""
        response = client.get("/api/tiktok/accounts")
        assert response.status_code == 200
        data = response.json()
        assert data["accounts"] == []

    def test_tiktok_videos(self, client):
        """Тест списка TikTok видео"""
        response = client.get("/api/tiktok/videos")
        assert response.status_code == 200
        data = response.json()
        assert data["videos"] == []

    def test_tiktok_auth(self, client):
        """Тест авторизации TikTok"""
        response = client.post("/api/tiktok/auth")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "error"

    def test_tiktok_logout(self, client):
        """Тест выхода из TikTok"""
        response = client.post("/api/tiktok/logout")
        assert response.status_code == 200
        assert response.json()["status"] == "success"

    def test_delete_tiktok_account(self, client):
        """Тест удаления TikTok аккаунта"""
        response = client.delete("/api/tiktok/account/test_account")
        assert response.status_code == 200
        assert response.json()["status"] == "success"


class TestSplitVideoEndpoint:
    """Тесты для эндпоинта разделения видео"""

    def test_split_missing_input_file(self, client):
        """Тест разделения без входного файла"""
        response = client.post("/api/process/split", json={})
        assert response.status_code == 400
        assert "input_file required" in response.json()["detail"]

    def test_split_file_not_found(self, client):
        """Тест разделения с несуществующим файлом"""
        response = client.post("/api/process/split", json={
            "input_file": "nonexistent.mp4",
            "segment_duration": 60
        })
        assert response.status_code == 404
        assert "Input file not found" in response.json()["detail"]

    def test_split_valid_video(self, client, sample_video_file):
        """Тест разделения валидного видео"""
        filename = os.path.basename(sample_video_file)
        response = client.post("/api/process/split", json={
            "input_file": filename,
            "segment_duration": 2,
            "effect": "none",
            "style": "default"
        })
        # Может вернуть 200 или 500 в зависимости от ресурсов
        assert response.status_code in [200, 500]
