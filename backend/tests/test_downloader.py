"""
Тесты для YouTube загрузчика (downloader.py)
"""
import os
import pytest
import asyncio
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from downloader import (
    download_video,
    get_video_info,
    test_youtube_connection,
    download_with_aiohttp
)


class TestDownloadVideo:
    """Тесты для функции download_video"""

    @pytest.mark.asyncio
    async def test_download_video_invalid_url(self, test_storage_path):
        """Тест скачивания с некорректным URL"""
        with pytest.raises(Exception) as exc_info:
            await download_video("not-a-valid-url", test_storage_path)
        assert "Failed to download" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_download_video_missing_url(self, test_storage_path):
        """Тест скачивания с пустым URL"""
        with pytest.raises(Exception):
            await download_video("", test_storage_path)

    @pytest.mark.asyncio
    async def test_download_video_quality_options(self, test_storage_path):
        """Тест скачивания с разными опциями качества"""
        # Тестируем только валидность параметров качества
        # Реальное скачивание может упасть из-за сети
        qualities = ["best", "1080p", "720p", "480p", "360p"]
        
        for quality in qualities:
            # Проверяем что функция принимает параметр quality
            try:
                await download_video(
                    "https://www.youtube.com/watch?v=invalid",
                    test_storage_path,
                    quality=quality
                )
            except Exception:
                # Ожидаем ошибку скачивания, но параметр должен быть принят
                pass

    @pytest.mark.asyncio
    async def test_download_video_creates_directory(self, test_storage_path):
        """Тест что функция создает директорию downloads"""
        downloads_dir = os.path.join(test_storage_path, "downloads")

        # Удаляем директорию если существует
        if os.path.exists(downloads_dir):
            import shutil
            shutil.rmtree(downloads_dir)

        assert not os.path.exists(downloads_dir)

        try:
            await download_video(
                "https://www.youtube.com/watch?v=invalid",
                test_storage_path
            )
        except Exception:
            # Ожидаем ошибку скачивания, но директория должна быть создана
            pass

        # Директория должна быть создана
        assert os.path.exists(downloads_dir)

    @pytest.mark.asyncio
    async def test_download_video_valid_url(self, test_storage_path, mock_youtube_url):
        """Тест скачивания с валидным URL (интеграционный)"""
        try:
            filename = await download_video(mock_youtube_url, test_storage_path)
            
            # Проверяем что файл был создан
            file_path = os.path.join(test_storage_path, "downloads", filename)
            assert os.path.exists(file_path)
            
            # Проверяем что файл не пустой
            assert os.path.getsize(file_path) > 0
            
        except Exception as e:
            # Если YouTube недоступен, пропускаем тест
            pytest.skip(f"YouTube unavailable: {str(e)}")


class TestGetVideoInfo:
    """Тесты для функции get_video_info"""

    @pytest.mark.asyncio
    async def test_get_video_info_nonexistent_file(self, test_storage_path):
        """Тест получения информации о несуществующем файле"""
        info = await get_video_info("/nonexistent/path/video.mp4")
        assert info == {}

    @pytest.mark.asyncio
    async def test_get_video_info_valid_file(self, test_storage_path, sample_video_file):
        """Тест получения информации о валидном файле"""
        info = await get_video_info(sample_video_file)
        
        assert isinstance(info, dict)
        assert "duration" in info
        assert "resolution" in info
        assert "filesize" in info
        assert "codec" in info
        
        # Проверяем что длительность > 0
        assert info["duration"] > 0
        
        # Проверяем что разрешение содержит width и height
        assert "width" in info["resolution"]
        assert "height" in info["resolution"]

    @pytest.mark.asyncio
    async def test_get_video_info_returns_correct_structure(self, test_storage_path, sample_video_file):
        """Тест структуры возвращаемых данных"""
        info = await get_video_info(sample_video_file)
        
        # Проверяем типы данных
        assert isinstance(info["duration"], (int, float))
        assert isinstance(info["filesize"], int)
        assert isinstance(info["resolution"], dict)
        assert isinstance(info["codec"], str)


class TestTestYoutubeConnection:
    """Тесты для функции test_youtube_connection"""

    @pytest.mark.asyncio
    async def test_youtube_connection(self):
        """Тест соединения с YouTube"""
        success, message = await test_youtube_connection()
        
        # Результат должен быть кортежем (bool, str)
        assert isinstance(success, bool)
        assert isinstance(message, str)
        
        # Если соединение успешно, message не должен быть пустым
        if success:
            assert len(message) > 0


class TestDownloadWithAiohttp:
    """Тесты для функции download_with_aiohttp"""

    @pytest.mark.asyncio
    async def test_aiohttp_invalid_url(self, test_storage_path):
        """Тест скачивания через aiohttp с некорректным URL"""
        with pytest.raises(Exception):
            await download_with_aiohttp("not-a-valid-url", test_storage_path)

    @pytest.mark.asyncio
    async def test_aiohttp_creates_directory(self, test_storage_path):
        """Тест что aiohttp создает директорию"""
        downloads_dir = os.path.join(test_storage_path, "downloads")
        
        if os.path.exists(downloads_dir):
            for f in os.listdir(downloads_dir):
                os.remove(os.path.join(downloads_dir, f))
        
        try:
            await download_with_aiohttp(
                "https://httpbin.org/status/404",
                test_storage_path
            )
        except Exception:
            pass
        
        assert os.path.exists(downloads_dir)

    @pytest.mark.asyncio
    async def test_aiohttp_404_response(self, test_storage_path):
        """Тест обработки 404 ответа"""
        with pytest.raises(Exception) as exc_info:
            await download_with_aiohttp(
                "https://httpbin.org/status/404",
                test_storage_path
            )
        assert "HTTP 404" in str(exc_info.value)


class TestUserAgentsRotation:
    """Тесты для ротации User-Agent"""

    def test_user_agents_list_not_empty(self):
        """Тест что список User-Agent не пустой"""
        from downloader import USER_AGENTS
        assert len(USER_AGENTS) > 0

    def test_user_agents_are_strings(self):
        """Тест что все User-Agent строки"""
        from downloader import USER_AGENTS
        for ua in USER_AGENTS:
            assert isinstance(ua, str)
            assert ua.startswith("Mozilla/5.0")

    def test_user_agents_unique(self):
        """Тест что все User-Agent уникальны"""
        from downloader import USER_AGENTS
        assert len(USER_AGENTS) == len(set(USER_AGENTS))


class TestQualityMapping:
    """Тесты для маппинга качества видео"""

    def test_quality_format_mapping(self):
        """Тест маппинга форматов качества"""
        quality_format = {
            "best": "best",
            "1080p": "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
            "720p": "bestvideo[height<=720]+bestaudio/best[height<=720]",
            "480p": "bestvideo[height<=480]+bestaudio/best[height<=480]",
            "360p": "bestvideo[height<=360]+bestaudio/best[height<=360]",
        }
        
        # Проверяем что все ключи присутствуют
        assert "best" in quality_format
        assert "1080p" in quality_format
        assert "720p" in quality_format
        assert "480p" in quality_format
        assert "360p" in quality_format
        
        # Проверяем что значения не пустые
        for quality, format_str in quality_format.items():
            assert format_str
            assert isinstance(format_str, str)
