"""
Тесты для планировщика (scheduler_manager.py)
"""
import os
import pytest
import json
from pathlib import Path
from datetime import datetime, timedelta
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from scheduler_manager import SchedulerManager, cut_series_job


class TestSchedulerManagerInit:
    """Тесты инициализации SchedulerManager"""

    def test_init_creates_instance(self, test_storage_path):
        """Тест создания экземпляра SchedulerManager"""
        schedules_file = Path(test_storage_path) / "schedules_test.json"
        manager = SchedulerManager(schedules_file)
        
        assert manager is not None
        assert manager.schedules_file == schedules_file

    def test_init_creates_schedules_file(self, test_storage_path):
        """Тест создания файла расписаний"""
        schedules_file = Path(test_storage_path) / "schedules_test.json"
        
        manager = SchedulerManager(schedules_file)
        
        assert schedules_file.exists()

    def test_init_creates_empty_list(self, test_storage_path):
        """Тест что файл содержит пустой список"""
        schedules_file = Path(test_storage_path) / "schedules_test.json"
        
        manager = SchedulerManager(schedules_file)
        schedules = manager.get_all_schedules()
        
        assert schedules == []

    def test_init_creates_parent_directory(self, test_storage_path):
        """Тест создания родительской директории"""
        schedules_file = Path(test_storage_path) / "subdir" / "schedules_test.json"
        
        manager = SchedulerManager(schedules_file)
        
        assert schedules_file.parent.exists()
        assert schedules_file.exists()


class TestSchedulerManagerAddSchedule:
    """Тесты добавления расписания"""

    def test_add_schedule_returns_id(self, test_storage_path):
        """Тест что добавление возвращает ID"""
        schedules_file = Path(test_storage_path) / "schedules_add_test.json"
        manager = SchedulerManager(schedules_file)
        
        schedule_id = manager.add_schedule(
            video_filename="test.mp4",
            caption="Test caption",
            schedule_time=datetime.now() + timedelta(hours=1),
            account_id="test_account"
        )
        
        assert schedule_id is not None
        assert len(schedule_id) > 0

    def test_add_schedule_increases_count(self, test_storage_path):
        """Тест что количество расписаний увеличивается"""
        schedules_file = Path(test_storage_path) / "schedules_count_test.json"
        manager = SchedulerManager(schedules_file)
        
        initial_count = len(manager.get_all_schedules())
        
        manager.add_schedule(
            video_filename="test.mp4",
            caption="Test caption",
            schedule_time=datetime.now() + timedelta(hours=1)
        )
        
        final_count = len(manager.get_all_schedules())
        assert final_count == initial_count + 1

    def test_add_schedule_persists_to_file(self, test_storage_path):
        """Тест что расписание сохраняется в файл"""
        schedules_file = Path(test_storage_path) / "schedules_persist_test.json"
        manager = SchedulerManager(schedules_file)
        
        schedule_time = datetime.now() + timedelta(hours=1)
        manager.add_schedule(
            video_filename="persist_test.mp4",
            caption="Persist test",
            schedule_time=schedule_time,
            account_id="persist_account"
        )
        
        # Читаем файл напрямую
        with open(schedules_file, 'r') as f:
            data = json.load(f)
        
        assert len(data) == 1
        assert data[0]["video_filename"] == "persist_test.mp4"
        assert data[0]["caption"] == "Persist test"

    def test_add_schedule_contains_required_fields(self, test_storage_path):
        """Тест что расписание содержит обязательные поля"""
        schedules_file = Path(test_storage_path) / "schedules_fields_test.json"
        manager = SchedulerManager(schedules_file)
        
        schedule_time = datetime.now() + timedelta(hours=1)
        schedule_id = manager.add_schedule(
            video_filename="test.mp4",
            caption="Test caption",
            schedule_time=schedule_time,
            account_id="test_account"
        )
        
        schedules = manager.get_all_schedules()
        schedule = schedules[0]
        
        assert schedule["schedule_id"] == schedule_id
        assert schedule["video_filename"] == "test.mp4"
        assert schedule["caption"] == "Test caption"
        assert schedule["schedule_time"] == schedule_time.isoformat()
        assert schedule["account_id"] == "test_account"
        assert schedule["status"] == "pending"
        assert "created_at" in schedule
        assert "updated_at" in schedule


class TestSchedulerManagerGetSchedules:
    """Тесты получения расписаний"""

    def test_get_all_schedules_empty(self, test_storage_path):
        """Тест получения пустого списка"""
        schedules_file = Path(test_storage_path) / "schedules_empty_test.json"
        manager = SchedulerManager(schedules_file)
        
        schedules = manager.get_all_schedules()
        
        assert schedules == []

    def test_get_all_schedules_returns_list(self, test_storage_path):
        """Тест что возвращается список"""
        schedules_file = Path(test_storage_path) / "schedules_list_test.json"
        manager = SchedulerManager(schedules_file)
        
        manager.add_schedule(
            video_filename="test.mp4",
            caption="Test",
            schedule_time=datetime.now() + timedelta(hours=1)
        )
        
        schedules = manager.get_all_schedules()
        
        assert isinstance(schedules, list)
        assert len(schedules) == 1

    def test_get_all_schedules_multiple(self, test_storage_path):
        """Тест получения нескольких расписаний"""
        schedules_file = Path(test_storage_path) / "schedules_multiple_test.json"
        manager = SchedulerManager(schedules_file)
        
        for i in range(3):
            manager.add_schedule(
                video_filename=f"test{i}.mp4",
                caption=f"Test {i}",
                schedule_time=datetime.now() + timedelta(hours=i+1)
            )
        
        schedules = manager.get_all_schedules()
        
        assert len(schedules) == 3


class TestSchedulerManagerDeleteSchedule:
    """Тесты удаления расписания"""

    def test_delete_schedule_removes_entry(self, test_storage_path):
        """Тест что удаление удаляет запись"""
        schedules_file = Path(test_storage_path) / "schedules_delete_test.json"
        manager = SchedulerManager(schedules_file)
        
        schedule_id = manager.add_schedule(
            video_filename="test.mp4",
            caption="Test",
            schedule_time=datetime.now() + timedelta(hours=1)
        )
        
        manager.delete_schedule(schedule_id)
        
        schedules = manager.get_all_schedules()
        assert len(schedules) == 0

    def test_delete_schedule_nonexistent(self, test_storage_path):
        """Тест удаления несуществующего расписания"""
        schedules_file = Path(test_storage_path) / "schedules_del_nonexistent_test.json"
        manager = SchedulerManager(schedules_file)
        
        # Не должно вызывать ошибку
        manager.delete_schedule("nonexistent_id")

    def test_delete_schedule_persists(self, test_storage_path):
        """Тест что удаление сохраняется в файл"""
        schedules_file = Path(test_storage_path) / "schedules_delpersist_test.json"
        manager = SchedulerManager(schedules_file)
        
        schedule_id = manager.add_schedule(
            video_filename="test.mp4",
            caption="Test",
            schedule_time=datetime.now() + timedelta(hours=1)
        )
        
        manager.delete_schedule(schedule_id)
        
        # Читаем файл напрямую
        with open(schedules_file, 'r') as f:
            data = json.load(f)
        
        assert len(data) == 0


class TestCutSeriesJob:
    """Тесты функции cut_series_job"""

    @pytest.mark.asyncio
    async def test_cut_series_job_source_not_found(self, test_storage_path):
        """Тест что job обрабатывает отсутствующий файл"""
        # Функция должна логировать ошибку и возвращаться
        # без исключения
        await cut_series_job(
            video_filename="/nonexistent/video.mp4",
            clip_length_sec=60
        )
        # Тест проходит если нет исключения

    @pytest.mark.asyncio
    async def test_cut_series_job_creates_clips(self, test_storage_path, sample_video_file):
        """Тест что job создает клипы"""
        # Получаем длительность тестового видео
        import subprocess
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            sample_video_file
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        duration = float(result.stdout.strip())
        
        clip_length = max(1, int(duration / 2))  # Режем на 2 части
        
        await cut_series_job(
            video_filename=sample_video_file,
            clip_length_sec=clip_length
        )
        
        # Проверяем что клипы созданы в той же директории
        output_dir = Path(sample_video_file).parent
        clips = list(output_dir.glob("*_part_*.mp4"))
        
        # Должен быть создан хотя бы 1 клип
        assert len(clips) >= 1

    @pytest.mark.asyncio
    async def test_cut_series_job_clip_count(self, test_storage_path, sample_video_file):
        """Тест что создается правильное количество клипов"""
        import subprocess
        
        # Получаем длительность
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            sample_video_file
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        duration = float(result.stdout.strip())
        
        clip_length = 2  # 2 секунды на клип
        expected_clips = int(duration / clip_length) + (1 if duration % clip_length > 0 else 0)
        
        await cut_series_job(
            video_filename=sample_video_file,
            clip_length_sec=clip_length
        )
        
        output_dir = Path(sample_video_file).parent
        clips = list(output_dir.glob("*_part_*.mp4"))
        
        # Проверяем что количество клипов примерно соответствует ожидаемому
        assert len(clips) >= 1
        assert len(clips) <= expected_clips + 1  # +1 для запаса
