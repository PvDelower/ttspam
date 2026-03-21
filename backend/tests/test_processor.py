"""
Тесты для процессора видео (processor.py)
"""
import os
import pytest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from processor import VideoProcessor, find_file


class TestVideoProcessorInit:
    """Тесты инициализации VideoProcessor"""

    def test_init_creates_instance(self, test_storage_path):
        """Тест создания экземпляра VideoProcessor"""
        processor = VideoProcessor(test_storage_path)
        assert processor is not None
        assert processor.storage_path == test_storage_path

    def test_init_creates_directories(self, test_storage_path):
        """Тест создания необходимых директорий"""
        processor = VideoProcessor(test_storage_path)
        
        assert os.path.exists(processor.outputs_dir)
        assert os.path.exists(processor.cache_dir)
        assert os.path.exists(processor.banners_dir)

    def test_init_outputs_dir_path(self, test_storage_path):
        """Тест правильного пути к outputs"""
        processor = VideoProcessor(test_storage_path)
        expected_path = os.path.join(test_storage_path, "outputs")
        assert processor.outputs_dir == expected_path

    def test_init_cache_dir_path(self, test_storage_path):
        """Тест правильного пути к cache"""
        processor = VideoProcessor(test_storage_path)
        expected_path = os.path.join(test_storage_path, "cache")
        assert processor.cache_dir == expected_path

    def test_init_banners_dir_path(self, test_storage_path):
        """Тест правильного пути к banners"""
        processor = VideoProcessor(test_storage_path)
        expected_path = os.path.join(test_storage_path, "banners")
        assert processor.banners_dir == expected_path


class TestVideoProcessorProcess:
    """Тесты обработки видео"""

    def test_process_missing_input_file(self, test_storage_path):
        """Тест обработки с несуществующим файлом"""
        processor = VideoProcessor(test_storage_path)
        
        result = processor.process(
            input_path="/nonexistent/video.mp4",
            output_dir=test_storage_path
        )
        
        assert result["status"] == "error"
        assert "not found" in result["message"].lower()

    def test_process_valid_video(self, test_storage_path, sample_video_file):
        """Тест обработки валидного видео"""
        processor = VideoProcessor(test_storage_path)
        
        result = processor.process(
            input_path=sample_video_file,
            output_dir=os.path.join(test_storage_path, "outputs")
        )
        
        assert result["status"] == "success"
        assert "output_id" in result
        assert "filename" in result
        assert "size" in result
        assert "processing_time" in result
        assert result["processing_time"] > 0

    def test_process_with_effects(self, test_storage_path, sample_video_file):
        """Тест обработки с эффектами"""
        processor = VideoProcessor(test_storage_path)
        
        effects = {
            "brightness": 0.1,
            "contrast": 1.1,
            "saturation": 1.2
        }
        
        result = processor.process(
            input_path=sample_video_file,
            output_dir=os.path.join(test_storage_path, "outputs"),
            effects=effects
        )
        
        assert result["status"] == "success"

    def test_process_with_trim(self, test_storage_path, sample_video_file):
        """Тест обработки с обрезкой"""
        processor = VideoProcessor(test_storage_path)
        
        trim = {
            "start": 0,
            "end": 3
        }
        
        result = processor.process(
            input_path=sample_video_file,
            output_dir=os.path.join(test_storage_path, "outputs"),
            trim=trim
        )
        
        assert result["status"] == "success"

    def test_process_with_banner(self, test_storage_path, sample_video_file, sample_banner_file):
        """Тест обработки с баннером"""
        processor = VideoProcessor(test_storage_path)
        
        banner = {
            "filename": os.path.basename(sample_banner_file),
            "position": "bottom",
            "height": 100,
            "transparent": True
        }
        
        result = processor.process(
            input_path=sample_video_file,
            output_dir=os.path.join(test_storage_path, "outputs"),
            banner=banner
        )
        
        assert result["status"] == "success"

    def test_process_creates_output_file(self, test_storage_path, sample_video_file):
        """Тест что обработка создает выходной файл"""
        processor = VideoProcessor(test_storage_path)
        outputs_dir = os.path.join(test_storage_path, "outputs")
        
        result = processor.process(
            input_path=sample_video_file,
            output_dir=outputs_dir
        )
        
        output_path = os.path.join(outputs_dir, result["filename"])
        assert os.path.exists(output_path)
        assert os.path.getsize(output_path) > 0

    def test_process_returns_processing_time(self, test_storage_path, sample_video_file):
        """Тест что возвращается время обработки"""
        processor = VideoProcessor(test_storage_path)
        
        result = processor.process(
            input_path=sample_video_file,
            output_dir=os.path.join(test_storage_path, "outputs")
        )
        
        assert result["processing_time"] > 0
        assert isinstance(result["processing_time"], float)


class TestVideoProcessorCreatePreview:
    """Тесты создания превью"""

    def test_create_preview_valid_video(self, test_storage_path, sample_video_file):
        """Тест создания превью для валидного видео"""
        processor = VideoProcessor(test_storage_path)
        cache_dir = os.path.join(test_storage_path, "cache")
        
        preview_path = processor.create_preview(
            input_path=sample_video_file,
            output_dir=cache_dir
        )
        
        assert os.path.exists(preview_path)
        assert preview_path.endswith(".png")

    def test_create_preview_creates_file(self, test_storage_path, sample_video_file):
        """Тест что превью создается в cache"""
        processor = VideoProcessor(test_storage_path)
        cache_dir = os.path.join(test_storage_path, "cache")
        
        preview_path = processor.create_preview(
            input_path=sample_video_file,
            output_dir=cache_dir
        )
        
        assert os.path.exists(preview_path)
        assert cache_dir in preview_path

    def test_create_preview_file_not_empty(self, test_storage_path, sample_video_file):
        """Тест что файл превью не пустой"""
        processor = VideoProcessor(test_storage_path)
        
        preview_path = processor.create_preview(
            input_path=sample_video_file,
            output_dir=os.path.join(test_storage_path, "cache")
        )
        
        assert os.path.getsize(preview_path) > 0

    def test_create_preview_returns_path(self, test_storage_path, sample_video_file):
        """Тест что возвращается путь к превью"""
        processor = VideoProcessor(test_storage_path)
        
        preview_path = processor.create_preview(
            input_path=sample_video_file,
            output_dir=os.path.join(test_storage_path, "cache")
        )
        
        assert isinstance(preview_path, str)
        assert "preview_" in preview_path


class TestFindFile:
    """Тесты функции find_file"""

    def test_find_file_in_downloads(self, test_storage_path, sample_video_file):
        """Тест поиска файла в downloads"""
        filename = os.path.basename(sample_video_file)
        
        found_path = find_file(filename, test_storage_path)
        
        assert found_path is not None
        assert os.path.exists(found_path)

    def test_find_file_in_outputs(self, test_storage_path, sample_video_file):
        """Тест поиска файла в outputs"""
        # Копируем файл в outputs
        import shutil
        outputs_dir = os.path.join(test_storage_path, "outputs")
        output_path = os.path.join(outputs_dir, "test_output.mp4")
        shutil.copy(sample_video_file, output_path)
        
        found_path = find_file("test_output.mp4", test_storage_path)
        
        assert found_path is not None
        assert outputs_dir in found_path

    def test_find_file_nonexistent(self, test_storage_path):
        """Тест поиска несуществующего файла"""
        found_path = find_file("nonexistent.mp4", test_storage_path)
        assert found_path is None

    def test_find_file_with_path_traversal(self, test_storage_path):
        """Тест безопасности с path traversal"""
        found_path = find_file("../etc/passwd", test_storage_path)
        assert found_path is None


class TestVideoProcessorBuildFFmpegCommand:
    """Тесты построения FFmpeg команды"""

    def test_build_command_basic(self, test_storage_path):
        """Тест построения базовой команды"""
        processor = VideoProcessor(test_storage_path)
        
        cmd = processor._build_ffmpeg_command(
            input_path="/path/to/video.mp4",
            output_path="/path/to/output.mp4"
        )
        
        assert "ffmpeg" in cmd[0]
        assert "-i" in cmd
        assert "/path/to/video.mp4" in cmd
        assert "libx264" in cmd

    def test_build_command_with_effects(self, test_storage_path):
        """Тест построения команды с эффектами"""
        processor = VideoProcessor(test_storage_path)
        
        cmd = processor._build_ffmpeg_command(
            input_path="/path/to/video.mp4",
            output_path="/path/to/output.mp4",
            effects={"brightness": 0.1}
        )
        
        # Команда должна содержать фильтры
        assert any("eq" in str(arg) for arg in cmd)

    def test_build_command_with_trim(self, test_storage_path):
        """Тест построения команды с trim"""
        processor = VideoProcessor(test_storage_path)
        
        cmd = processor._build_ffmpeg_command(
            input_path="/path/to/video.mp4",
            output_path="/path/to/output.mp4",
            trim={"start": 0, "end": 10}
        )
        
        # Команда должна содержать trim фильтр
        assert any("trim" in str(arg).lower() for arg in cmd)


class TestVideoProcessorGetVideoInfo:
    """Тесты получения информации о видео"""

    def test_get_video_info_valid_file(self, test_storage_path, sample_video_file):
        """Тест получения информации о валидном файле"""
        processor = VideoProcessor(test_storage_path)
        
        info = processor._get_video_info(sample_video_file)
        
        assert isinstance(info, dict)
        assert "width" in info
        assert "height" in info
        assert "duration" in info

    def test_get_video_info_nonexistent_file(self, test_storage_path):
        """Тест получения информации о несуществующем файле"""
        processor = VideoProcessor(test_storage_path)
        
        info = processor._get_video_info("/nonexistent/video.mp4")
        
        # Должны вернуться дефолтные значения
        assert info["width"] == 200
        assert info["height"] == 100

    def test_get_video_info_returns_dimensions(self, test_storage_path, sample_video_file):
        """Тест что возвращаются размеры видео"""
        processor = VideoProcessor(test_storage_path)
        
        info = processor._get_video_info(sample_video_file)
        
        assert info["width"] > 0
        assert info["height"] > 0


class TestVideoProcessorFindBannerFile:
    """Тесты поиска файла баннера"""

    def test_find_banner_in_banners_dir(self, test_storage_path, sample_banner_file):
        """Тест поиска баннера в banners"""
        processor = VideoProcessor(test_storage_path)
        filename = os.path.basename(sample_banner_file)
        
        found_path = processor._find_banner_file(filename)
        
        assert found_path is not None
        assert os.path.exists(found_path)

    def test_find_banner_nonexistent(self, test_storage_path):
        """Тест поиска несуществующего баннера"""
        processor = VideoProcessor(test_storage_path)
        
        found_path = processor._find_banner_file("nonexistent.gif")
        
        assert found_path is None
