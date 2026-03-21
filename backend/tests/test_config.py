"""
Тесты для конфигурации и логгера
"""
import os
import pytest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import Config
from logger import setup_logger


class TestConfig:
    """Тесты конфигурации"""

    def test_config_default_values(self):
        """Тест значений по умолчанию"""
        # Очищаем переменные окружения для теста
        import os
        old_storage = os.environ.pop('STORAGE_PATH', None)
        old_max_size = os.environ.pop('MAX_FILE_SIZE', None)
        old_log_level = os.environ.pop('LOG_LEVEL', None)
        
        try:
            config = Config()
            
            assert config.STORAGE_PATH == "storage"
            assert config.MAX_FILE_SIZE == 104857600  # 100MB
            assert config.LOG_LEVEL == "INFO"
            assert config.PROCESSING_TIMEOUT == 300  # 5 минут
        finally:
            # Восстанавливаем переменные
            if old_storage:
                os.environ['STORAGE_PATH'] = old_storage
            if old_max_size:
                os.environ['MAX_FILE_SIZE'] = old_max_size
            if old_log_level:
                os.environ['LOG_LEVEL'] = old_log_level

    def test_config_tiktok_credentials(self):
        """Тест TikTok учетных данных"""
        config = Config()
        
        creds = config.tiktok_credentials
        assert "username" in creds
        assert "password" in creds
        assert isinstance(creds["username"], str)
        assert isinstance(creds["password"], str)

    def test_config_allowed_origins(self):
        """Тест разрешенных origins"""
        config = Config()
        
        # По умолчанию должен быть localhost:3000
        assert "http://localhost:3000" in config.ALLOWED_ORIGINS

    def test_config_max_file_size_type(self):
        """Тест типа MAX_FILE_SIZE"""
        config = Config()
        
        assert isinstance(config.MAX_FILE_SIZE, int)
        assert config.MAX_FILE_SIZE > 0

    def test_config_processing_timeout_type(self):
        """Тест типа PROCESSING_TIMEOUT"""
        config = Config()
        
        assert isinstance(config.PROCESSING_TIMEOUT, int)
        assert config.PROCESSING_TIMEOUT > 0

    def test_config_with_env_override(self, monkeypatch):
        """Тест переопределения через переменные окружения"""
        monkeypatch.setenv("STORAGE_PATH", "/custom/storage")
        monkeypatch.setenv("MAX_FILE_SIZE", "209715200")  # 200MB
        monkeypatch.setenv("LOG_LEVEL", "DEBUG")
        
        # Создаем новый экземпляр Config
        config = Config()
        
        assert config.STORAGE_PATH == "/custom/storage"
        assert config.MAX_FILE_SIZE == 209715200
        assert config.LOG_LEVEL == "DEBUG"


class TestLogger:
    """Тесты логгера"""

    def test_setup_logger_returns_logger(self):
        """Тест что setup_logger возвращает логгер"""
        logger = setup_logger()
        
        assert logger is not None
        assert logger.name == "video_automation"

    def test_setup_logger_creates_log_directory(self):
        """Тест что создается директория для логов"""
        logger = setup_logger()
        
        assert os.path.exists("logs")

    def test_setup_logger_creates_log_file(self):
        """Тест что создается файл лога"""
        logger = setup_logger()
        
        from datetime import datetime
        expected_filename = f"video_automation_{datetime.now().strftime('%Y%m%d')}.log"
        log_file = os.path.join("logs", expected_filename)
        
        assert os.path.exists(log_file)

    def test_setup_logger_handlers(self):
        """Тест что у логгера есть обработчики"""
        logger = setup_logger()
        
        # Должны быть как минимум 2 обработчика (файл + консоль)
        assert len(logger.handlers) >= 2

    def test_setup_logger_level(self):
        """Тест уровня логгирования"""
        logger = setup_logger()
        
        assert logger.level <= 20  # INFO level or lower

    def test_logger_can_log_info(self):
        """Тест что логгер может логировать info"""
        logger = setup_logger()
        
        # Не должно вызывать исключений
        logger.info("Test info message")

    def test_logger_can_log_error(self):
        """Тест что логгер может логировать error"""
        logger = setup_logger()
        
        # Не должно вызывать исключений
        logger.error("Test error message")

    def test_logger_can_log_warning(self):
        """Тест что логгер может логировать warning"""
        logger = setup_logger()
        
        # Не должно вызывать исключений
        logger.warning("Test warning message")

    def test_logger_can_log_debug(self):
        """Тест что логгер может логировать debug"""
        logger = setup_logger()
        
        # Не должно вызывать исключений
        logger.debug("Test debug message")

    def test_multiple_setup_logger_calls(self):
        """Тест нескольких вызовов setup_logger"""
        logger1 = setup_logger()
        logger2 = setup_logger()
        
        # Должны возвращать один и тот же логгер
        assert logger1 is logger2

    def test_logger_no_duplicate_handlers(self):
        """Тест что нет дубликатов обработчиков"""
        # Вызываем несколько раз
        setup_logger()
        setup_logger()
        setup_logger()
        
        logger = setup_logger()
        
        # Проверяем что нет дубликатов одного типа
        handler_types = [type(h).__name__ for h in logger.handlers]
        # FileHandler должен быть один
        assert handler_types.count("FileHandler") <= 1
        # StreamHandler должен быть один
        assert handler_types.count("StreamHandler") <= 1
