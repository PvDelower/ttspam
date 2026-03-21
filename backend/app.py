"""
Video Automation API v3.0 - Стабильная версия на основе VA4
"""
from pathlib import Path
from datetime import datetime
import os
import json
import subprocess
import shutil

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from logger import setup_logger

# Инициализация приложения
app = FastAPI(title="Video Automation API", version="3.0")

# CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Логгер
logger = setup_logger()

# ============================================
# 📁 Директории хранения (Path объекты)
# ============================================
# Поддержка переменной окружения для тестов и Docker
STORAGE_DIR = Path(os.environ.get("STORAGE_DIR", os.environ.get("STORAGE_PATH", "storage")))
DOWNLOADS_DIR = STORAGE_DIR / "downloads"
OUTPUTS_DIR = STORAGE_DIR / "outputs"
BANNERS_DIR = STORAGE_DIR / "banners"
CACHE_DIR = STORAGE_DIR / "cache"

# Создаем директории
for d in [DOWNLOADS_DIR, OUTPUTS_DIR, BANNERS_DIR, CACHE_DIR]:
    d.mkdir(parents=True, exist_ok=True)

logger.info(f"✅ Storage directories configured:")
logger.info(f"   📁 Downloads: {DOWNLOADS_DIR.absolute()}")
logger.info(f"   📁 Outputs:   {OUTPUTS_DIR.absolute()}")
logger.info(f"   📁 Banners:   {BANNERS_DIR.absolute()}")
logger.info(f"   📁 Cache:     {CACHE_DIR.absolute()}")


# ============================================
# 🔧 Helper функции
# ============================================
def _sanitize_youtube_url(url: str) -> str:
    """Убирает невидимые/не-ASCII символы из URL"""
    if not url:
        return url
    url = url.strip()
    return "".join(c for c in url if ord(c) < 128)


def _find_video_file(filename: str) -> Path:
    """Ищет файл в downloads и outputs"""
    # Проверяем path traversal
    if ".." in filename or filename.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    # Ищем в downloads
    path = DOWNLOADS_DIR / filename
    if path.exists():
        return path
    
    # Ищем в outputs
    path = OUTPUTS_DIR / filename
    if path.exists():
        return path
    
    raise HTTPException(status_code=404, detail=f"File not found: {filename}")


# ============================================
# 📌 Health Check Endpoints
# ============================================
@app.get("/")
async def root_redirect():
    """Redirect from / to /api/"""
    return {
        "status": "running",
        "message": "Video Automation API v3.0",
        "version": "3.0.0",
        "docs": "/docs"
    }


@app.get("/api/")
async def root():
    return {
        "status": "running",
        "message": "Video Automation API v3.0",
        "version": "3.0.0"
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "storage_path": str(STORAGE_DIR.absolute()),
        "directories": {
            "downloads": str(DOWNLOADS_DIR.absolute()),
            "outputs": str(OUTPUTS_DIR.absolute()),
            "banners": str(BANNERS_DIR.absolute()),
            "cache": str(CACHE_DIR.absolute()),
        }
    }


# ============================================
# 📁 File Management Endpoints
# ============================================
@app.get("/api/files")
async def get_files(directory: str = "downloads"):
    """Получить список файлов из директории"""
    if directory not in ["downloads", "outputs"]:
        raise HTTPException(status_code=400, detail="Invalid directory")
    
    dir_path = STORAGE_DIR / directory
    
    if not dir_path.exists():
        dir_path.mkdir(parents=True, exist_ok=True)
        return {"files": [], "count": 0, "directory": directory}
    
    try:
        files = []
        for f in dir_path.glob("*"):
            if f.is_file() and not f.name.startswith("."):
                stat = f.stat()
                files.append({
                    "id": f.name,
                    "name": f.name,
                    "size": stat.st_size,
                    "size_mb": round(stat.st_size / 1024 / 1024, 2),
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "directory": directory,
                })
        
        files.sort(key=lambda x: x["modified"], reverse=True)
        return {
            "status": "success",
            "directory": directory,
            "count": len(files),
            "files": files,
        }
    except Exception as e:
        logger.error(f"Error getting files: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/file/{filename}")
async def delete_file(filename: str, directory: str = "downloads"):
    """Удалить файл"""
    if directory not in ["downloads", "outputs", "banners"]:
        raise HTTPException(status_code=400, detail="Invalid directory")
    
    # Проверка на path traversal
    if ".." in filename or filename.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    file_path = STORAGE_DIR / directory / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        file_path.unlink()
        logger.info(f"✅ File deleted: {filename}")
        return {"status": "success", "message": f"File {filename} deleted"}
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# 🎬 Preview Endpoint (видео превью)
# ============================================
@app.post("/api/preview")
async def create_preview(request: dict):
    """Создать видео-превью для видео (короткий фрагмент)"""
    file_id = request.get("file_id")
    duration = request.get("duration", 5)  # Длительность превью в секундах

    if not file_id:
        raise HTTPException(status_code=400, detail="file_id required")

    try:
        # Ищем файл в downloads и outputs
        input_path = _find_video_file(file_id)
        
        logger.info(f"🎨 Preview request for: {file_id}")
        logger.info(f"📁 File path: {input_path}")

        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        preview_name = f"preview_{Path(file_id).stem}.mp4"
        preview_path = CACHE_DIR / preview_name

        # Получаем длительность видео
        probe_cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(input_path),
        ]
        probe_result = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=30)
        
        if probe_result.returncode == 0:
            video_duration = float(probe_result.stdout.strip())
            # Начинаем с 10% от длительности или с 1 секунды
            ss_time = max(1, video_duration * 0.1)
            # Ограничиваем длительность превью
            preview_duration = min(duration, video_duration - ss_time)
        else:
            ss_time = 1
            preview_duration = duration
        
        logger.info(f"⏱️ Creating preview: start={ss_time:.1f}s, duration={preview_duration:.1f}s")

        # Создаем видео-превью (короткий фрагмент)
        cmd = [
            "ffmpeg",
            "-ss", str(ss_time),
            "-i", str(input_path),
            "-t", str(preview_duration),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "28",  # Более высокое сжатие для превью
            "-c:a", "aac",
            "-b:a", "64k",
            "-movflags", "+faststart",
            "-y",
            str(preview_path),
        ]

        logger.info(f"🎨 Creating video preview: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

        if result.returncode != 0:
            logger.error(f"Preview FFmpeg error: {result.stderr}")
            raise HTTPException(status_code=500, detail=f"FFmpeg error: {result.stderr}")
        
        if not preview_path.exists():
            logger.error(f"Preview file not created: {preview_path}")
            raise HTTPException(status_code=500, detail="Preview file not created")

        # Получаем размер превью
        preview_size = preview_path.stat().st_size
        
        logger.info(f"✅ Video preview created: {preview_name} ({preview_size / 1024 / 1024:.2f} MB)")
        return {
            "status": "success",
            "preview_url": f"/api/preview-video/{preview_name}",
            "filename": preview_name,
            "size": preview_size,
            "size_mb": round(preview_size / 1024 / 1024, 2),
            "duration": preview_duration,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Preview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/preview-video/{filename}")
async def get_preview_video(filename: str):
    """Получить видео-превью"""
    if ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    file_path = CACHE_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Preview not found")

    from fastapi.responses import StreamingResponse
    
    # Открываем файл и отдаем с правильными заголовками
    def iterfile():
        with open(file_path, mode="rb") as file_like:
            yield from file_like

    return StreamingResponse(
        iterfile(),
        media_type="video/mp4",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Accept-Ranges": "bytes",
        }
    )


# ============================================
# 🎨 Banner Endpoints
# ============================================
@app.get("/api/banners")
async def get_banners():
    """Получить список баннеров"""
    try:
        BANNERS_DIR.mkdir(parents=True, exist_ok=True)
        banners = []
        
        for f in BANNERS_DIR.glob("*"):
            if f.is_file() and not f.name.startswith("."):
                banners.append({
                    "id": f.name,
                    "name": f.name,
                    "size": f.stat().st_size,
                    "size_mb": round(f.stat().st_size / 1024 / 1024, 2),
                    "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                })
        
        banners.sort(key=lambda x: x["modified"], reverse=True)
        return {"banners": banners, "count": len(banners)}
    except Exception as e:
        logger.error(f"Error getting banners: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/banner/upload")
async def upload_banner(file: UploadFile = File(...)):
    """Загрузить баннер"""
    try:
        BANNERS_DIR.mkdir(parents=True, exist_ok=True)
        
        # Проверка расширения
        allowed_extensions = [".gif", ".png", ".jpg", ".jpeg", ".mp4", ".webp"]
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Сохраняем файл
        file_path = BANNERS_DIR / file.filename
        content = await file.read()
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        logger.info(f"✅ Banner uploaded: {file.filename}")
        return {
            "status": "success",
            "banner_id": file.filename,
            "size": len(content),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading banner: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# 📥 YouTube Download Endpoint
# ============================================
@app.post("/api/download")
async def download_video(request: dict):
    """Скачать видео с YouTube"""
    youtube_url = request.get("youtube_url") or request.get("url")
    quality = request.get("quality", "best")
    
    if not youtube_url:
        raise HTTPException(status_code=400, detail="youtube_url required")
    
    youtube_url = _sanitize_youtube_url(youtube_url)
    if not youtube_url:
        raise HTTPException(status_code=400, detail="Invalid URL")
    
    try:
        DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
        
        # Форматы качества
        quality_format = {
            "best": "bestvideo[height<=1080]+bestaudio/best",
            "4K": "bestvideo[height<=2160]+bestaudio/best",
            "1440p": "bestvideo[height<=1440]+bestaudio/best",
            "1080p": "bestvideo[height<=1080]+bestaudio/best",
            "720p": "bestvideo[height<=720]+bestaudio/best",
            "480p": "bestvideo[height<=480]+bestaudio/best",
            "360p": "bestvideo[height<=360]+bestaudio/best",
        }
        
        fmt = quality_format.get(quality, "bestvideo[height<=1080]+bestaudio/best")
        
        cmd = [
            "yt-dlp",
            "-f", fmt,
            "--merge-output-format", "mp4",
            "--no-warnings",
            "-o", str(DOWNLOADS_DIR / "%(title)s.%(ext)s"),
            youtube_url,
        ]
        
        logger.info(f"🔄 Downloading: {youtube_url} (quality: {quality})")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            error_msg = result.stderr or result.stdout
            logger.error(f"Download error: {error_msg}")
            raise Exception(f"Download failed: {error_msg}")
        
        # Находим скачанный файл
        files = [f for f in DOWNLOADS_DIR.glob("*") 
                 if f.suffix.lower() in ['.mp4', '.mkv', '.webm', '.avi', '.mov']
                 and not f.name.startswith(".")]
        
        if not files:
            raise Exception("No video files found after download")
        
        latest_file = max(files, key=lambda f: f.stat().st_ctime)
        logger.info(f"✅ Downloaded: {latest_file.name}")
        
        return {
            "status": "success",
            "file_id": latest_file.name,
            "path": str(latest_file),
            "size": latest_file.stat().st_size,
            "size_mb": round(latest_file.stat().st_size / 1024 / 1024, 2),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# ✂️ Video Processing Endpoint
# ============================================
@app.post("/api/process")
async def process_video_endpoint(request: dict):
    """Обработать видео (обрезка, эффекты, баннер)"""
    input_file = request.get("input_file") or request.get("input_filename")
    start_time = request.get("start_time")
    end_time = request.get("end_time")
    brightness = request.get("brightness", 0)
    contrast = request.get("contrast", 1.0)
    saturation = request.get("saturation", 1.0)
    banner_file = request.get("banner_file")
    effect = (request.get("effect") or "none").strip().lower()
    
    if not input_file:
        raise HTTPException(status_code=400, detail="input_file required")
    
    try:
        input_path = _find_video_file(input_file)
        OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
        
        output_file = f"processed_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{input_file}"
        output_path = OUTPUTS_DIR / output_file
        
        # TikTok разрешение
        TIKTOK_WIDTH = 1080
        TIKTOK_HEIGHT = 1920
        
        # Строим FFmpeg команду
        cmd = ["ffmpeg", "-i", str(input_path)]
        
        # Баннер
        banner_exists = False
        if banner_file:
            banner_path = BANNERS_DIR / banner_file
            if banner_path.exists():
                cmd += ["-i", str(banner_path)]
                banner_exists = True
        
        # Фильтры
        filters = []
        
        # Обрезка
        if start_time is not None:
            filters.append(f"trim=start={start_time}")
            if end_time:
                filters[-1] += f":end={end_time}"
        
        # Эффекты
        if brightness != 0 or contrast != 1.0 or saturation != 1.0:
            filters.append(f"eq=brightness={brightness}:contrast={contrast}:saturation={saturation}")
        
        # Зеркало
        if effect == "mirror":
            filters.append("hflip")
        
        # Масштабирование под TikTok
        filters.append(f"scale={TIKTOK_WIDTH}:{TIKTOK_HEIGHT}:force_original_aspect_ratio=decrease,pad={TIKTOK_WIDTH}:{TIKTOK_HEIGHT}:(ow-iw)/2:(oh-ih)/2")
        
        # Баннер поверх видео
        if banner_exists:
            # Баннер на [1], видео на [0]
            filters.append(f"[0:v][1:v]overlay=0:0")
        
        if filters:
            cmd.extend(["-vf", ",".join(filters)])
        
        # Вывод
        cmd.extend([
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "192k",
            "-y",
            str(output_path),
        ])
        
        logger.info(f"⏳ Processing: {input_file}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        
        if result.returncode != 0:
            logger.error(f"Processing error: {result.stderr}")
            raise Exception(f"Processing failed: {result.stderr}")
        
        logger.info(f"✅ Processed: {output_file}")
        return {
            "status": "success",
            "file_id": output_file,
            "path": str(output_path),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# 📤 File Upload Endpoint
# ============================================
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Загрузить видео файл"""
    try:
        DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
        
        allowed_extensions = [".mp4", ".mkv", ".webm", ".avi", ".mov", ".mov"]
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        file_path = DOWNLOADS_DIR / file.filename
        content = await file.read()
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        logger.info(f"✅ File uploaded: {file.filename}")
        return {
            "status": "success",
            "file_id": file.filename,
            "size": len(content),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# 📺 TikTok Endpoints (заглушки)
# ============================================
@app.get("/api/tiktok/user")
async def get_tiktok_user():
    return {"status": "not_authenticated", "user": None}


@app.get("/api/tiktok/accounts")
async def get_tiktok_accounts():
    return {"accounts": [], "count": 0}


@app.get("/api/tiktok/videos")
async def get_tiktok_videos():
    return {"videos": [], "count": 0}


@app.post("/api/tiktok/auth")
async def tiktok_auth():
    return {"status": "error", "message": "TikTok auth not configured"}


@app.post("/api/tiktok/logout")
async def tiktok_logout():
    return {"status": "success"}


@app.delete("/api/tiktok/account/{account_id}")
async def delete_tiktok_account(account_id: str):
    return {"status": "success"}


# ============================================
# 📅 Scheduled Posts Endpoints
# ============================================
@app.get("/api/scheduled_posts")
async def get_scheduled_posts():
    """Получить список запланированных постов"""
    try:
        posts_file = STORAGE_DIR / "scheduled_posts.json"
        if not posts_file.exists():
            return {"posts": [], "count": 0}
        
        with open(posts_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            return {"posts": data.get("posts", []), "count": len(data.get("posts", []))}
    except Exception as e:
        logger.error(f"Error getting scheduled posts: {e}")
        return {"posts": [], "count": 0}


# ============================================
# 🎬 Video Split Endpoint
# ============================================
@app.post("/api/process/split")
async def split_video(request: dict):
    """Разделить видео на сегменты"""
    input_file = request.get("input_file") or request.get("input_filename")
    segment_duration = request.get("segment_duration", 60)
    
    if not input_file:
        raise HTTPException(status_code=400, detail="input_file required")
    
    try:
        input_path = _find_video_file(input_file)
        OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
        
        # Получаем длительность видео
        probe_cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(input_path),
        ]
        result = subprocess.run(probe_cmd, capture_output=True, text=True)
        duration = float(result.stdout.strip())
        
        # Рассчитываем количество сегментов
        num_segments = max(1, int(duration / segment_duration) + (1 if duration % segment_duration else 0))
        
        logger.info(f"📊 Video: {duration:.1f}s, Segment: {segment_duration}s, Parts: {num_segments}")
        
        output_files = []
        for i in range(num_segments):
            start = i * segment_duration
            output_name = f"segment_{i+1:03d}_{input_path.name}"
            output_path = OUTPUTS_DIR / output_name
            
            cmd = [
                "ffmpeg",
                "-i", str(input_path),
                "-ss", str(start),
                "-t", str(segment_duration),
                "-c:v", "libx264",
                "-c:a", "aac",
                "-y",
                str(output_path),
            ]
            
            logger.info(f"🎬 Creating segment {i+1}/{num_segments} ({start}s - {start+segment_duration}s)")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

            if result.returncode == 0:
                output_files.append(output_name)
                
                # Создаем GIF из первого сегмента
                if i == 0:
                    try:
                        gif_path = OUTPUTS_DIR / f"segment_{i+1:03d}.gif"
                        # Создаем 3-секундную гифку из начала сегмента
                        gif_cmd = [
                            "ffmpeg",
                            "-i", str(output_path),
                            "-t", "3",
                            "-vf", "fps=10,scale=480:-1:flags=lanczos",
                            "-y",
                            str(gif_path),
                        ]
                        gif_result = subprocess.run(gif_cmd, capture_output=True, text=True, timeout=60)
                        if gif_result.returncode == 0:
                            logger.info(f"🎨 Created GIF: {gif_path.name}")
                    except Exception as gif_err:
                        logger.warning(f"⚠️ GIF creation failed: {gif_err}")

        return {
            "status": "success",
            "segments": output_files,
            "count": len(output_files),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Split error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# 🏃 Startup/Shutdown events
# ============================================
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Video Automation API v3.0 starting...")
    logger.info(f"📁 Storage: {STORAGE_DIR.absolute()}")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("👋 Video Automation API shutting down")
