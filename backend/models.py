from pydantic import BaseModel, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import re

# ==================== Модели для app_main.py (VideoProcessor) ====================

class EffectsConfig(BaseModel):
    """Конфигурация эффектов видео"""
    brightness: Optional[float] = None
    contrast: Optional[float] = None
    saturation: Optional[float] = None
    blur: Optional[float] = None
    grayscale: Optional[bool] = None
    sepia: Optional[bool] = None

class BannerConfig(BaseModel):
    """Конфигурация баннера/гифки"""
    filename: str
    position: Optional[str] = "bottom"  # bottom, top, watermark, custom
    height: Optional[int] = 100
    x: Optional[int] = None
    y: Optional[int] = None
    transparent: Optional[bool] = True  # Прозрачный фон

class TrimConfig(BaseModel):
    """Конфигурация обрезки по времени"""
    start: Optional[float] = 0
    end: Optional[float] = None
    duration: Optional[float] = None

class ProcessRequest(BaseModel):
    """Запрос на обработку видео"""
    file_id: str
    effects: Optional[EffectsConfig] = None
    banner: Optional[BannerConfig] = None
    trim: Optional[TrimConfig] = None

class DownloadRequest(BaseModel):
    """Запрос на скачивание видео"""
    url: str
    quality: Optional[str] = "720p"

# ==================== SCHEDULER ====================

class ScheduleConfig(BaseModel):
    """Конфигурация расписания для нарезки видео"""
    schedule_id: Optional[str] = None
    source_file_id: str  # Путь до исходного видео
    clip_length_sec: int  # Длина каждого клипа в секундах
    cron: str = "0 0 * * *"  # Cron выражение для планирования
    tiktok_auto_upload: bool = False
    tiktok_account_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# ==================== Модели для app.py (legacy) ====================

class VideoProcessRequest(BaseModel):
    input_filename: str
    effects: Optional[List[str]] = None
    resize: Optional[Dict[str, int]] = None

    @validator('input_filename')
    def validate_filename(cls, v):
        if not v or '..' in v or v.startswith('/'):
            raise ValueError('Invalid filename')
        return v

class TrimRequest(BaseModel):
    input_filename: str
    start_time: float
    end_time: float

    @validator('input_filename')
    def validate_filename(cls, v):
        if not v or '..' in v or v.startswith('/'):
            raise ValueError('Invalid filename')
        return v

    @validator('start_time')
    def validate_start_time(cls, v):
        if v < 0:
            raise ValueError('Start time must be positive')
        return v

    @validator('end_time')
    def validate_end_time(cls, v, values):
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('End time must be greater than start time')
        return v

class EffectRequest(BaseModel):
    input_filename: str
    effects: List[str]

    @validator('input_filename')
    def validate_filename(cls, v):
        if not v or '..' in v or v.startswith('/'):
            raise ValueError('Invalid filename')
        return v

    @validator('effects')
    def validate_effects(cls, v):
        if not v:
            raise ValueError('Effects list cannot be empty')
        return v

class ScheduleRequest(BaseModel):
    video_filename: str
    caption: str
    schedule_time: datetime

    @validator('video_filename')
    def validate_filename(cls, v):
        if not v or '..' in v or v.startswith('/'):
            raise ValueError('Invalid filename')
        return v

    @validator('caption')
    def validate_caption(cls, v):
        if len(v) > 2200:  # Ограничение TikTok
            raise ValueError('Caption too long')
        return v

    @validator('schedule_time')
    def validate_schedule_time(cls, v):
        if v.timestamp() < datetime.now().timestamp():
            raise ValueError('Schedule time must be in the future')
        return v

class VideoInfo(BaseModel):
    filename: str
    duration: float
    resolution: Dict[str, int]
    filesize: int

class ProcessingResult(BaseModel):
    output_filename: str
    processing_time: float
    success: bool
    errors: Optional[List[str]] = None