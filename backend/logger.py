import logging
import os
from datetime import datetime

def setup_logger():
    """Настройка логгера"""
    # Создаем директорию для логов если её нет
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # Создаем логгер
    logger = logging.getLogger('video_automation')
    logger.setLevel(logging.INFO)
    
    # Создаем форматтер
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Создаем файловый обработчик
    log_filename = os.path.join(log_dir, f"video_automation_{datetime.now().strftime('%Y%m%d')}.log")
    file_handler = logging.FileHandler(log_filename, encoding='utf-8')
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    
    # Создаем консольный обработчик
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    
    # Добавляем обработчики к логгеру
    if not logger.handlers:  # Избегаем дублирования обработчиков
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
    
    return logger