"""
Тесты для моделей Pydantic (models.py)
"""
import pytest
from datetime import datetime, timedelta
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from models import (
    EffectsConfig,
    BannerConfig,
    TrimConfig,
    ProcessRequest,
    DownloadRequest,
    ScheduleConfig,
    VideoProcessRequest,
    TrimRequest,
    EffectRequest,
    ScheduleRequest,
    VideoInfo,
    ProcessingResult
)


class TestEffectsConfig:
    """Тесты модели EffectsConfig"""

    def test_effects_config_empty(self):
        """Тест пустой конфигурации эффектов"""
        config = EffectsConfig()
        
        assert config.brightness is None
        assert config.contrast is None
        assert config.saturation is None
        assert config.blur is None
        assert config.grayscale is None
        assert config.sepia is None

    def test_effects_config_with_values(self):
        """Тест конфигурации со значениями"""
        config = EffectsConfig(
            brightness=0.5,
            contrast=1.2,
            saturation=1.5,
            blur=2.0,
            grayscale=True,
            sepia=False
        )
        
        assert config.brightness == 0.5
        assert config.contrast == 1.2
        assert config.saturation == 1.5
        assert config.blur == 2.0
        assert config.grayscale is True
        assert config.sepia is False

    def test_effects_config_partial(self):
        """Тест частичной конфигурации"""
        config = EffectsConfig(brightness=0.3)
        
        assert config.brightness == 0.3
        assert config.contrast is None


class TestBannerConfig:
    """Тесты модели BannerConfig"""

    def test_banner_config_minimal(self):
        """Тест минимальной конфигурации баннера"""
        config = BannerConfig(filename="test.gif")
        
        assert config.filename == "test.gif"
        assert config.position == "bottom"
        assert config.height == 100
        assert config.x is None
        assert config.y is None
        assert config.transparent is True

    def test_banner_config_full(self):
        """Тест полной конфигурации баннера"""
        config = BannerConfig(
            filename="banner.webm",
            position="top",
            height=150,
            x=100,
            y=200,
            transparent=False
        )
        
        assert config.filename == "banner.webm"
        assert config.position == "top"
        assert config.height == 150
        assert config.x == 100
        assert config.y == 200
        assert config.transparent is False

    def test_banner_config_position_values(self):
        """Тест допустимых значений позиции"""
        positions = ["bottom", "top", "watermark", "bottom_center", "top_left"]
        
        for pos in positions:
            config = BannerConfig(filename="test.gif", position=pos)
            assert config.position == pos


class TestTrimConfig:
    """Тесты модели TrimConfig"""

    def test_trim_config_default(self):
        """Тест конфигурации по умолчанию"""
        config = TrimConfig()
        
        assert config.start == 0
        assert config.end is None
        assert config.duration is None

    def test_trim_config_with_end(self):
        """Тест конфигурации с end"""
        config = TrimConfig(start=5, end=15)
        
        assert config.start == 5
        assert config.end == 15
        assert config.duration is None

    def test_trim_config_with_duration(self):
        """Тест конфигурации с duration"""
        config = TrimConfig(start=5, duration=10)
        
        assert config.start == 5
        assert config.duration == 10
        assert config.end is None


class TestProcessRequest:
    """Тесты модели ProcessRequest"""

    def test_process_request_minimal(self):
        """Тест минимального запроса"""
        request = ProcessRequest(file_id="video.mp4")
        
        assert request.file_id == "video.mp4"
        assert request.effects is None
        assert request.banner is None
        assert request.trim is None

    def test_process_request_full(self):
        """Тест полного запроса"""
        request = ProcessRequest(
            file_id="video.mp4",
            effects=EffectsConfig(brightness=0.5),
            banner=BannerConfig(filename="banner.gif"),
            trim=TrimConfig(start=0, end=30)
        )
        
        assert request.file_id == "video.mp4"
        assert request.effects is not None
        assert request.banner is not None
        assert request.trim is not None


class TestDownloadRequest:
    """Тесты модели DownloadRequest"""

    def test_download_request_minimal(self):
        """Тест минимального запроса скачивания"""
        request = DownloadRequest(url="https://youtube.com/watch?v=test")
        
        assert request.url == "https://youtube.com/watch?v=test"
        assert request.quality == "720p"

    def test_download_request_with_quality(self):
        """Тест запроса с качеством"""
        qualities = ["best", "1080p", "720p", "480p", "360p"]
        
        for quality in qualities:
            request = DownloadRequest(
                url="https://youtube.com/watch?v=test",
                quality=quality
            )
            assert request.quality == quality


class TestScheduleConfig:
    """Тесты модели ScheduleConfig"""

    def test_schedule_config_default(self):
        """Тест конфигурации по умолчанию"""
        config = ScheduleConfig(source_file_id="video.mp4", clip_length_sec=60)
        
        assert config.source_file_id == "video.mp4"
        assert config.clip_length_sec == 60
        assert config.cron == "0 0 * * *"
        assert config.tiktok_auto_upload is False
        assert config.tiktok_account_id is None
        assert config.created_at is None
        assert config.updated_at is None

    def test_schedule_config_full(self):
        """Тест полной конфигурации"""
        now = datetime.now()
        config = ScheduleConfig(
            schedule_id="test_id",
            source_file_id="source.mp4",
            clip_length_sec=120,
            cron="*/30 * * * *",
            tiktok_auto_upload=True,
            tiktok_account_id="tiktok_user",
            created_at=now,
            updated_at=now
        )
        
        assert config.schedule_id == "test_id"
        assert config.clip_length_sec == 120
        assert config.cron == "*/30 * * * *"
        assert config.tiktok_auto_upload is True
        assert config.tiktok_account_id == "tiktok_user"


class TestVideoProcessRequest:
    """Тесты модели VideoProcessRequest"""

    def test_video_process_request_valid(self):
        """Тест валидного запроса"""
        request = VideoProcessRequest(
            input_filename="video.mp4",
            effects=["brightness"],
            resize={"width": 1080, "height": 1920}
        )
        
        assert request.input_filename == "video.mp4"
        assert request.effects == ["brightness"]
        assert request.resize == {"width": 1080, "height": 1920}

    def test_video_process_request_invalid_filename_path_traversal(self):
        """Тест невалидного имени файла с path traversal"""
        with pytest.raises(ValueError) as exc_info:
            VideoProcessRequest(input_filename="../etc/passwd")
        assert "Invalid filename" in str(exc_info.value)

    def test_video_process_request_invalid_filename_empty(self):
        """Тест пустого имени файла"""
        with pytest.raises(ValueError):
            VideoProcessRequest(input_filename="")

    def test_video_process_request_optional_fields(self):
        """Тест с опциональными полями"""
        request = VideoProcessRequest(input_filename="video.mp4")
        
        assert request.effects is None
        assert request.resize is None


class TestTrimRequest:
    """Тесты модели TrimRequest"""

    def test_trim_request_valid(self):
        """Тест валидного запроса"""
        request = TrimRequest(
            input_filename="video.mp4",
            start_time=0,
            end_time=10
        )
        
        assert request.input_filename == "video.mp4"
        assert request.start_time == 0
        assert request.end_time == 10

    def test_trim_request_negative_start(self):
        """Тест отрицательного времени начала"""
        with pytest.raises(ValueError):
            TrimRequest(
                input_filename="video.mp4",
                start_time=-1,
                end_time=10
            )

    def test_trim_request_end_before_start(self):
        """Тест когда end < start"""
        with pytest.raises(ValueError):
            TrimRequest(
                input_filename="video.mp4",
                start_time=10,
                end_time=5
            )


class TestEffectRequest:
    """Тесты модели EffectRequest"""

    def test_effect_request_valid(self):
        """Тест валидного запроса"""
        request = EffectRequest(
            input_filename="video.mp4",
            effects=["brightness", "contrast"]
        )
        
        assert request.input_filename == "video.mp4"
        assert request.effects == ["brightness", "contrast"]

    def test_effect_request_empty_effects(self):
        """Тест пустого списка эффектов"""
        with pytest.raises(ValueError):
            EffectRequest(input_filename="video.mp4", effects=[])

    def test_effect_request_single_effect(self):
        """Тест с одним эффектом"""
        request = EffectRequest(
            input_filename="video.mp4",
            effects=["grayscale"]
        )
        assert len(request.effects) == 1


class TestScheduleRequest:
    """Тесты модели ScheduleRequest"""

    def test_schedule_request_valid(self):
        """Тест валидного запроса"""
        future_time = datetime.now() + timedelta(hours=1)
        request = ScheduleRequest(
            video_filename="video.mp4",
            caption="Test caption",
            schedule_time=future_time
        )
        
        assert request.video_filename == "video.mp4"
        assert request.caption == "Test caption"
        assert request.schedule_time == future_time

    def test_schedule_request_past_time(self):
        """Тест времени в прошлом"""
        past_time = datetime.now() - timedelta(hours=1)
        
        with pytest.raises(ValueError):
            ScheduleRequest(
                video_filename="video.mp4",
                caption="Test",
                schedule_time=past_time
            )

    def test_schedule_request_long_caption(self):
        """Тест длинного описания"""
        future_time = datetime.now() + timedelta(hours=1)
        long_caption = "A" * 2201  # Больше 2200 символов
        
        with pytest.raises(ValueError):
            ScheduleRequest(
                video_filename="video.mp4",
                caption=long_caption,
                schedule_time=future_time
            )

    def test_schedule_request_short_caption(self):
        """Тест короткого описания"""
        future_time = datetime.now() + timedelta(hours=1)
        request = ScheduleRequest(
            video_filename="video.mp4",
            caption="Short",
            schedule_time=future_time
        )
        assert request.caption == "Short"


class TestVideoInfo:
    """Тесты модели VideoInfo"""

    def test_video_info_valid(self):
        """Тест валидной информации о видео"""
        info = VideoInfo(
            filename="video.mp4",
            duration=120.5,
            resolution={"width": 1920, "height": 1080},
            filesize=10485760
        )
        
        assert info.filename == "video.mp4"
        assert info.duration == 120.5
        assert info.resolution == {"width": 1920, "height": 1080}
        assert info.filesize == 10485760


class TestProcessingResult:
    """Тесты модели ProcessingResult"""

    def test_processing_result_success(self):
        """Тест успешного результата"""
        result = ProcessingResult(
            output_filename="output.mp4",
            processing_time=30.5,
            success=True
        )
        
        assert result.output_filename == "output.mp4"
        assert result.processing_time == 30.5
        assert result.success is True
        assert result.errors is None

    def test_processing_result_error(self):
        """Тест результата с ошибкой"""
        result = ProcessingResult(
            output_filename="",
            processing_time=5.0,
            success=False,
            errors=["Error 1", "Error 2"]
        )
        
        assert result.success is False
        assert result.errors == ["Error 1", "Error 2"]
