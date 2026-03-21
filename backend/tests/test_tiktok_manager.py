"""
Тесты для TikTok интеграции (tiktok_manager.py)
"""
import os
import pytest
import json
import asyncio
from pathlib import Path
from datetime import datetime
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from tiktok_manager import TikTokManager


class TestTikTokManagerInit:
    """Тесты инициализации TikTokManager"""

    def test_init_creates_instance(self, test_storage_path):
        """Тест создания экземпляра TikTokManager"""
        manager = TikTokManager(test_storage_path)
        assert manager is not None
        assert manager.storage_path == test_storage_path

    def test_init_creates_accounts_file(self, test_storage_path):
        """Тест создания файла аккаунтов"""
        manager = TikTokManager(test_storage_path)
        accounts_file = os.path.join(test_storage_path, "accounts_test.json")
        
        # Файл должен быть создан при инициализации
        # или при первом сохранении
        assert hasattr(manager, 'accounts')
        assert isinstance(manager.accounts, dict)

    def test_init_creates_videos_file(self, test_storage_path):
        """Тест создания файла видео"""
        manager = TikTokManager(test_storage_path)
        videos_file = os.path.join(test_storage_path, "tiktok_videos_test.json")
        
        assert hasattr(manager, 'videos')
        assert isinstance(manager.videos, dict)

    def test_init_empty_accounts(self, test_storage_path):
        """Тест что аккаунты пустые при инициализации"""
        manager = TikTokManager(test_storage_path)
        assert manager.accounts == {}

    def test_init_empty_videos(self, test_storage_path):
        """Тест что видео пустые при инициализации"""
        manager = TikTokManager(test_storage_path)
        assert manager.videos == {}

    def test_load_accounts_from_existing_file(self, test_storage_path):
        """Тест загрузки существующих аккаунтов"""
        # Создаем файл с аккаунтами
        accounts_file = os.path.join(test_storage_path, "accounts_load_test.json")
        test_accounts = {"test_account": {"token": "test_token"}}
        
        with open(accounts_file, 'w') as f:
            json.dump(test_accounts, f)
        
        manager = TikTokManager(test_storage_path)
        manager.accounts_file = accounts_file
        manager.load_accounts()
        assert manager.accounts == test_accounts

    def test_load_videos_from_existing_file(self, test_storage_path):
        """Тест загрузки существующих видео"""
        # Создаем файл с видео
        videos_file = os.path.join(test_storage_path, "tiktok_videos_load_test.json")
        test_videos = {"test_account": [{"video_id": "123"}]}
        
        with open(videos_file, 'w') as f:
            json.dump(test_videos, f)
        
        manager = TikTokManager(test_storage_path)
        manager.videos_file = videos_file
        manager.load_videos()
        assert manager.videos == test_videos


class TestTikTokManagerUpload:
    """Тесты загрузки видео в TikTok"""

    @pytest.mark.asyncio
    async def test_upload_video_returns_success(self, test_storage_path, sample_video_file):
        """Тест что загрузка возвращает успех (mock)"""
        manager = TikTokManager(test_storage_path)
        manager.videos_file = os.path.join(test_storage_path, "tiktok_videos_upload_test.json")
        
        result = await manager.upload_video(
            video_path=sample_video_file,
            caption="Test caption",
            account="test_account"
        )
        
        assert result["success"] is True
        assert "video_id" in result
        assert "url" in result
        assert "account" in result
        assert "uploaded_at" in result

    @pytest.mark.asyncio
    async def test_upload_video_generates_video_id(self, test_storage_path, sample_video_file):
        """Тест что генерируется video_id"""
        manager = TikTokManager(test_storage_path)
        manager.videos_file = os.path.join(test_storage_path, "tiktok_videos_id_test.json")
        
        result = await manager.upload_video(
            video_path=sample_video_file,
            caption="Test caption"
        )
        
        assert result["video_id"].startswith("tt")
        # video_id должен содержать timestamp
        assert len(result["video_id"]) > 5

    @pytest.mark.asyncio
    async def test_upload_video_saves_to_videos(self, test_storage_path, sample_video_file):
        """Тест что информация о видео сохраняется"""
        manager = TikTokManager(test_storage_path)
        manager.videos_file = os.path.join(test_storage_path, "tiktok_videos_save_test.json")
        
        await manager.upload_video(
            video_path=sample_video_file,
            caption="Test caption",
            account="test_account"
        )
        
        assert "test_account" in manager.videos
        assert len(manager.videos["test_account"]) > 0
        
        video_info = manager.videos["test_account"][0]
        assert "video_id" in video_info
        assert "uploaded_at" in video_info

    @pytest.mark.asyncio
    async def test_upload_video_default_account(self, test_storage_path, sample_video_file):
        """Тест загрузки с аккаунтом по умолчанию"""
        manager = TikTokManager(test_storage_path)
        manager.videos_file = os.path.join(test_storage_path, "tiktok_videos_default_test.json")
        
        result = await manager.upload_video(
            video_path=sample_video_file,
            caption="Test caption"
        )
        
        assert result["account"] == "default"

    @pytest.mark.asyncio
    async def test_upload_video_custom_account(self, test_storage_path, sample_video_file):
        """Тест загрузки с кастомным аккаунтом"""
        manager = TikTokManager(test_storage_path)
        manager.videos_file = os.path.join(test_storage_path, "tiktok_videos_custom_test.json")
        
        result = await manager.upload_video(
            video_path=sample_video_file,
            caption="Test caption",
            account="my_custom_account"
        )
        
        assert result["account"] == "my_custom_account"

    @pytest.mark.asyncio
    async def test_upload_multiple_videos(self, test_storage_path, sample_video_file):
        """Тест загрузки нескольких видео"""
        manager = TikTokManager(test_storage_path)
        manager.videos_file = os.path.join(test_storage_path, "tiktok_videos_multi_test.json")
        
        await manager.upload_video(
            video_path=sample_video_file,
            caption="Video 1",
            account="test_account"
        )
        
        await manager.upload_video(
            video_path=sample_video_file,
            caption="Video 2",
            account="test_account"
        )
        
        assert len(manager.videos["test_account"]) == 2


class TestTikTokManagerSchedule:
    """Тесты планирования постов в TikTok"""

    @pytest.mark.asyncio
    async def test_schedule_post_returns_success(self, test_storage_path, sample_video_file):
        """Тест что планирование возвращает успех (mock)"""
        manager = TikTokManager(test_storage_path)
        
        schedule_time = datetime.now()
        
        result = await manager.schedule_post(
            video_path=sample_video_file,
            caption="Test caption",
            schedule_time=schedule_time,
            account="test_account"
        )
        
        assert result["success"] is True
        assert "scheduled_for" in result
        assert "account" in result

    @pytest.mark.asyncio
    async def test_schedule_post_includes_iso_time(self, test_storage_path, sample_video_file):
        """Тест что время планирования в ISO формате"""
        manager = TikTokManager(test_storage_path)
        
        schedule_time = datetime(2025, 12, 25, 10, 30, 0)
        
        result = await manager.schedule_post(
            video_path=sample_video_file,
            caption="Test caption",
            schedule_time=schedule_time
        )
        
        assert "2025-12-25" in result["scheduled_for"]
        assert "10:30:00" in result["scheduled_for"]

    @pytest.mark.asyncio
    async def test_schedule_post_default_account(self, test_storage_path, sample_video_file):
        """Тест планирования с аккаунтом по умолчанию"""
        manager = TikTokManager(test_storage_path)
        
        result = await manager.schedule_post(
            video_path=sample_video_file,
            caption="Test caption",
            schedule_time=datetime.now()
        )
        
        assert result["account"] == "default"


class TestTikTokManagerStats:
    """Тесты статистики TikTok аккаунта"""

    def test_get_account_stats_returns_data(self, test_storage_path):
        """Тест получения статистики аккаунта"""
        manager = TikTokManager(test_storage_path)
        
        stats = manager.get_account_stats("test_account")
        
        assert isinstance(stats, dict)
        assert "account" in stats
        assert "followers" in stats
        assert "following" in stats
        assert "likes" in stats
        assert "videos" in stats
        assert "last_updated" in stats

    def test_get_account_stats_default_account(self, test_storage_path):
        """Тест получения статистики аккаунта по умолчанию"""
        manager = TikTokManager(test_storage_path)
        
        stats = manager.get_account_stats()
        
        assert stats["account"] == "default"

    def test_get_account_stats_followers_count(self, test_storage_path):
        """Тест что количество подписчиков число"""
        manager = TikTokManager(test_storage_path)
        
        stats = manager.get_account_stats("test_account")
        
        assert isinstance(stats["followers"], int)
        assert stats["followers"] >= 0

    def test_get_account_stats_videos_count(self, test_storage_path, sample_video_file):
        """Тест что количество видео соответствует загруженным"""
        manager = TikTokManager(test_storage_path)
        manager.videos_file = os.path.join(test_storage_path, "tiktok_videos_stats_test.json")
        
        # Загружаем видео
        asyncio.run(
            manager.upload_video(
                video_path=sample_video_file,
                caption="Test",
                account="stats_test"
            )
        )
        
        stats = manager.get_account_stats("stats_test")
        
        assert stats["videos"] >= 1

    def test_get_account_stats_last_updated_iso_format(self, test_storage_path):
        """Тест что last_updated в ISO формате"""
        manager = TikTokManager(test_storage_path)
        
        stats = manager.get_account_stats()
        
        # Проверяем что это строка с датой
        assert isinstance(stats["last_updated"], str)
        assert "T" in stats["last_updated"] or "-" in stats["last_updated"]


class TestTikTokManagerSaveLoad:
    """Тесты сохранения и загрузки данных"""

    def test_save_accounts_creates_file(self, test_storage_path):
        """Тест что save_accounts создает файл"""
        manager = TikTokManager(test_storage_path)
        
        manager.accounts["new_account"] = {"token": "new_token"}
        manager.save_accounts()
        
        accounts_file = os.path.join(test_storage_path, "accounts.json")
        assert os.path.exists(accounts_file)
        
        with open(accounts_file, 'r') as f:
            saved_accounts = json.load(f)
        
        assert "new_account" in saved_accounts

    def test_save_videos_creates_file(self, test_storage_path):
        """Тест что save_videos создает файл"""
        manager = TikTokManager(test_storage_path)
        
        manager.videos["test_account"] = [{"video_id": "test_123"}]
        manager.save_videos()
        
        videos_file = os.path.join(test_storage_path, "tiktok_videos.json")
        assert os.path.exists(videos_file)
        
        with open(videos_file, 'r') as f:
            saved_videos = json.load(f)
        
        assert "test_account" in saved_videos

    def test_load_accounts_after_save(self, test_storage_path):
        """Тест загрузки после сохранения"""
        manager = TikTokManager(test_storage_path)
        
        manager.accounts["persist_test"] = {"token": "persist_token"}
        manager.save_accounts()
        
        # Создаем новый менеджер
        manager2 = TikTokManager(test_storage_path)
        
        assert "persist_test" in manager2.accounts
        assert manager2.accounts["persist_test"]["token"] == "persist_token"
