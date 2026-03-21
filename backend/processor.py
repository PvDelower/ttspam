"""
Video Processor - стабильная обработка видео на основе VA4
"""
import subprocess
import logging
from pathlib import Path
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)


def process_video(
    video_path: Path,
    output_dir: Path,
    effects: Optional[Dict] = None,
    banner: Optional[Dict] = None,
    trim: Optional[Dict] = None,
    target_width: int = 1080,
    target_height: int = 1920,
) -> str:
    """Process video with effects, banner overlay, and trimming

    Args:
        video_path: Path to input video
        output_dir: Output directory
        effects: Video effects {brightness, contrast, saturation}
        banner: Banner overlay config {filename, position, height}
        trim: Trim config {start, end}
        target_width: Target width (default 1080 for TikTok)
        target_height: Target height (default 1920 for TikTok)

    Returns:
        Output file ID (filename)
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    
    input_file = str(video_path)
    output_file = str(output_dir / f"processed_{video_path.stem}.mp4")
    
    # Проверяем существование баннера заранее
    banner_path = None
    if banner and banner.get("filename"):
        banners_dir = Path("storage") / "banners"
        banner_path = banners_dir / banner["filename"]
        if not banner_path.exists():
            logger.warning(f"Banner not found: {banner_path}")
            banner_path = None
        else:
            logger.info(f"🎨 Using banner: {banner['filename']}")
    
    # Build FFmpeg filter chain - ВАЖНО: правильный порядок фильтров
    video_filters = []
    
    # 1. Применяем trim первым (для видео и аудио)
    if trim:
        start = trim.get("start", 0)
        end = trim.get("end")
        if end:
            video_filters.append(f"trim=start={start}:end={end},setpts=PTS-STARTPTS")
            audio_filters = [f"atrim=start={start}:end={end},asetpts=PTS-STARTPTS"]
        else:
            video_filters.append(f"trim=start={start},setpts=PTS-STARTPTS")
            audio_filters = [f"atrim=start={start},asetpts=PTS-STARTPTS"]
    else:
        audio_filters = []
    
    # 2. Применяем color/brightness эффекты
    if effects:
        brightness = effects.get("brightness", 0)
        contrast = effects.get("contrast", 1.0)
        saturation = effects.get("saturation", 1.0)
        eq_filter = f"eq=brightness={brightness}:contrast={contrast}:saturation={saturation}"
        video_filters.append(eq_filter)
    
    # 3. Масштабирование и паддинг для TikTok (9:16 вертикальный формат)
    # Используем качественный алгоритм масштабирования
    scale_filter = f"scale={target_width}:{target_height}:force_original_aspect_ratio=decrease:flags=lanczos,pad={target_width}:{target_height}:(ow-iw)/2:(oh-ih)/2:color=black"
    video_filters.append(scale_filter)
    
    # Собираем видеопоток фильтров
    video_filter_chain = ",".join(video_filters)
    
    # Build FFmpeg command
    cmd = ["ffmpeg", "-i", input_file]
    
    # Добавляем баннер как второй вход если существует
    inputs_count = 1
    if banner_path:
        cmd.extend(["-loop", "1", "-i", str(banner_path)])
        inputs_count = 2
    
    # Строим комплексный фильтр для правильной обработки
    if banner_path:
        # Создаем сложный фильтр с наложением баннера
        # [0:v] - исходное видео, [1:v] - баннер, [0:a] - аудио
        filter_parts = []
        
        # Применяем все фильтры к видео [0:v] -> [filtered]
        filter_parts.append(f"[0:v]{video_filter_chain}[filtered]")
        
        # Накладываем баннер поверх обработанного видео
        # Баннер позиционируется внизу (y = main_h - overlay_h)
        filter_parts.append("[filtered][1:v]overlay=0:main_h-overlay_h:shortest=1[final]")
        
        # Если есть аудио обработка или просто копируем аудио
        if audio_filters:
            filter_parts.append(f"[0:a]{audio_filters[0]}[aaudio]")
            cmd.extend(["-filter_complex", ";".join(filter_parts)])
            cmd.extend(["-map", "[final]", "-map", "[aaudio]"])
        else:
            # Просто добавляем аудио без обработки
            cmd.extend(["-filter_complex", ";".join(filter_parts)])
            cmd.extend(["-map", "[final]", "-map", "0:a?"])
    else:
        # Без баннера - используем простой видеофильтр
        if audio_filters:
            # С аудио обработкой - используем split подход
            filter_complex = f"{video_filter_chain};{audio_filters[0]}"
            cmd.extend(["-filter_complex", filter_complex])
            cmd.extend(["-map", "0:v", "-map", "0:a"])
        else:
            # Только видео фильтры, аудио копируем
            cmd.extend(["-vf", video_filter_chain])
            cmd.extend(["-map", "0:v", "-map", "0:a?"])
    
    # Output options - оптимизированные настройки для TikTok
    cmd.extend([
        "-c:v", "libx264",
        "-preset", "slow",  # Лучшее качество сжатия
        "-crf", "18",  # Высокое качество (меньше = лучше, 18-23 оптимально)
        "-pix_fmt", "yuv420p",  # Совместимость с TikTok
        "-profile:v", "high",
        "-level", "4.0",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "44100",
        "-movflags", "+faststart",  # Для стриминга
        "-y",  # Overwrite output file
        output_file,
    ])
    
    try:
        logger.info(f"⏳ Processing: {video_path.name}")
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=600)
        logger.info(f"✅ Video processed: {Path(output_file).name}")
        return Path(output_file).name
    
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ FFmpeg error: {e.stderr}")
        raise Exception(f"Video processing failed: {e.stderr}")
    except subprocess.TimeoutExpired as e:
        logger.error(f"❌ Processing timeout: {e}")
        raise Exception(f"Processing timeout exceeded")
    except Exception as e:
        logger.error(f"❌ Processing error: {e}")
        raise Exception(f"Processing failed: {str(e)}")


def create_preview(video_path: Path, cache_dir: Path) -> str:
    """Create preview image from video"""
    cache_dir.mkdir(parents=True, exist_ok=True)
    
    preview_name = f"preview_{video_path.stem}.png"
    preview_path = cache_dir / preview_name
    
    cmd = [
        "ffmpeg",
        "-ss", "3",
        "-i", str(video_path),
        "-frames:v", "1",
        "-q:v", "2",
        "-y",
        str(preview_path),
    ]
    
    try:
        logger.info(f"🎨 Creating preview for {video_path.name}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode != 0 or not preview_path.exists():
            logger.error(f"Preview error: {result.stderr}")
            raise Exception("Failed to create preview")
        
        return preview_name
    except Exception as e:
        logger.error(f"❌ Preview error: {e}")
        raise Exception(f"Preview failed: {str(e)}")


def trim_video(video_path: Path, output_dir: Path, start_time: float, end_time: float) -> str:
    """Trim video to specified duration"""
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = str(output_dir / f"trimmed_{video_path.stem}.mp4")
    
    cmd = [
        "ffmpeg", "-i", str(video_path),
        "-ss", str(start_time), "-to", str(end_time),
        "-c:v", "libx264", "-preset", "medium", "-crf", "23",
        "-c:a", "aac", "-y", output_file,
    ]
    
    try:
        logger.info(f"✂️ Trimming: {video_path.name}")
        subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=600)
        return Path(output_file).name
    except Exception as e:
        logger.error(f"❌ Trim error: {e}")
        raise Exception(f"Trim failed: {str(e)}")


def add_effects(video_path: Path, output_dir: Path, effects: Dict) -> str:
    """Add effects to video"""
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = str(output_dir / f"effects_{video_path.stem}.mp4")
    
    filters = []
    brightness = effects.get("brightness", 0)
    contrast = effects.get("contrast", 1.0)
    saturation = effects.get("saturation", 1.0)
    
    if brightness != 0 or contrast != 1.0 or saturation != 1.0:
        filters.append(f"eq=brightness={brightness}:contrast={contrast}:saturation={saturation}")
    
    cmd = ["ffmpeg", "-i", str(video_path)]
    if filters:
        cmd.extend(["-vf", ",".join(filters)])
    cmd.extend([
        "-c:v", "libx264", "-preset", "medium", "-crf", "23",
        "-c:a", "aac", "-y", output_file,
    ])
    
    try:
        logger.info(f"✨ Adding effects: {video_path.name}")
        subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=600)
        return Path(output_file).name
    except Exception as e:
        logger.error(f"❌ Effects error: {e}")
        raise Exception(f"Effects failed: {str(e)}")


def resize_video(video_path: Path, output_dir: Path, width: int, height: int) -> str:
    """Resize video to specified dimensions"""
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = str(output_dir / f"resized_{video_path.stem}.mp4")
    
    cmd = [
        "ffmpeg", "-i", str(video_path),
        "-vf", f"scale={width}:{height}",
        "-c:v", "libx264", "-preset", "medium", "-crf", "23",
        "-c:a", "aac", "-y", output_file,
    ]
    
    try:
        logger.info(f"📐 Resizing: {video_path.name} to {width}x{height}")
        subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=600)
        return Path(output_file).name
    except Exception as e:
        logger.error(f"❌ Resize error: {e}")
        raise Exception(f"Resize failed: {str(e)}")


def split_video(video_path: Path, output_dir: Path, segment_duration: int = 60) -> List[str]:
    """Split video into segments"""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    probe_cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(video_path),
    ]
    
    result = subprocess.run(probe_cmd, capture_output=True, text=True)
    duration = float(result.stdout.strip())
    num_segments = max(1, int(duration / segment_duration) + (1 if duration % segment_duration else 0))
    
    logger.info(f"📊 Video: {duration:.1f}s, Segment: {segment_duration}s, Parts: {num_segments}")
    
    output_files = []
    for i in range(num_segments):
        start = i * segment_duration
        output_name = f"segment_{i+1:03d}_{video_path.name}"
        output_path = output_dir / output_name
        
        cmd = [
            "ffmpeg", "-i", str(video_path),
            "-ss", str(start), "-t", str(segment_duration),
            "-c:v", "libx264", "-c:a", "aac", "-y", str(output_path),
        ]
        
        logger.info(f"🎬 Creating segment {i+1}/{num_segments}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0:
            output_files.append(output_name)
    
    return output_files


def get_video_info(video_path: Path) -> dict:
    """Get video information"""
    probe_cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,codec_name,duration",
        "-show_entries", "format=duration",
        "-of", "json",
        str(video_path),
    ]
    
    result = subprocess.run(probe_cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return {}
    
    import json
    info = json.loads(result.stdout)
    stream = info.get("streams", [{}])[0]
    
    return {
        "width": stream.get("width", 0),
        "height": stream.get("height", 0),
        "codec": stream.get("codec_name", ""),
        "duration": float(stream.get("duration", 0)),
    }


def find_file(filename: str, storage_path: str) -> Optional[str]:
    """Find file in downloads or outputs directory"""
    storage = Path(storage_path)
    
    # Check downloads
    downloads = storage / "downloads" / filename
    if downloads.exists():
        return str(downloads)
    
    # Check outputs
    outputs = storage / "outputs" / filename
    if outputs.exists():
        return str(outputs)
    
    return None


# ============================================
# Класс для совместимости со старыми тестами
# ============================================

class VideoProcessor:
    """Класс для обработки видео (обертка для совместимости)"""
    
    def __init__(self, storage_path: str):
        self.storage_path = storage_path
        self.outputs_dir = Path(storage_path) / "outputs"
        self.cache_dir = Path(storage_path) / "cache"
        self.banners_dir = Path(storage_path) / "banners"
        
        for d in [self.outputs_dir, self.cache_dir, self.banners_dir]:
            d.mkdir(parents=True, exist_ok=True)
    
    def process(self, input_path: str, output_dir: str, **kwargs) -> dict:
        """Process video (обертка для совместимости)"""
        import time
        start_time = time.time()
        
        try:
            # Проверяем существование файла
            if not Path(input_path).exists():
                return {
                    "status": "error",
                    "message": "Input file not found",
                }
            
            output_filename = process_video(
                video_path=Path(input_path),
                output_dir=Path(output_dir),
                effects=kwargs.get("effects"),
                banner=kwargs.get("banner"),
                trim=kwargs.get("trim"),
                target_width=kwargs.get("target_width", 1080),
                target_height=kwargs.get("target_height", 1920),
            )
            
            output_path = Path(output_dir) / output_filename
            processing_time = time.time() - start_time
            
            return {
                "status": "success",
                "output_id": output_filename,
                "filename": output_filename,
                "size": output_path.stat().st_size,
                "processing_time": processing_time,
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
            }
    
    def create_preview(self, input_path: str) -> dict:
        """Create preview (обертка для совместимости)"""
        try:
            preview_name = create_preview(
                video_path=Path(input_path),
                cache_dir=self.cache_dir,
            )
            return {
                "status": "success",
                "preview_id": preview_name,
                "filename": preview_name,
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
            }
    
    def trim(self, input_path: str, output_dir: str, start: float, end: float) -> dict:
        """Trim video (обертка для совместимости)"""
        try:
            output_filename = trim_video(
                video_path=Path(input_path),
                output_dir=Path(output_dir),
                start_time=start,
                end_time=end,
            )
            return {
                "status": "success",
                "output_id": output_filename,
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
            }
    
    def add_effects(self, input_path: str, output_dir: str, effects: Dict) -> dict:
        """Add effects (обертка для совместимости)"""
        try:
            output_filename = add_effects(
                video_path=Path(input_path),
                output_dir=Path(output_dir),
                effects=effects,
            )
            return {
                "status": "success",
                "output_id": output_filename,
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
            }
    
    def resize(self, input_path: str, output_dir: str, width: int, height: int) -> dict:
        """Resize video (обертка для совместимости)"""
        try:
            output_filename = resize_video(
                video_path=Path(input_path),
                output_dir=Path(output_dir),
                width=width,
                height=height,
            )
            return {
                "status": "success",
                "output_id": output_filename,
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
            }
    
    def find_file(self, filename: str) -> Optional[str]:
        """Find file (обертка для совместимости)"""
        return find_file(filename, self.storage_path)
    
    def _get_video_info(self, video_path: str) -> dict:
        """Get video info (обертка для совместимости)"""
        return get_video_info(Path(video_path))
