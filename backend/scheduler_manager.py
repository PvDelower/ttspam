import json
import logging
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime
import uuid
import subprocess

logger = logging.getLogger(__name__)

class SchedulerManager:
    """Manage schedules for cutting video series"""
    
    def __init__(self, schedules_file: Path):
        self.schedules_file = schedules_file
        self._ensure_file()
    
    def _ensure_file(self):
        if not self.schedules_file.exists():
            self.schedules_file.parent.mkdir(parents=True, exist_ok=True)
            with self.schedules_file.open('w') as f:
                json.dump([], f)
    
    def _load(self) -> List[dict]:
        try:
            with self.schedules_file.open('r') as f:
                return json.load(f)
        except:
            return []
    
    def _save(self, schedules: List[dict]):
        with self.schedules_file.open('w') as f:
            json.dump(schedules, f, indent=2, default=str)

    def add_schedule(self, video_filename: str, caption: str, schedule_time: datetime, account_id: str = "default") -> str:
        """Add new schedule to storage"""
        schedule_id = str(uuid.uuid4())
        
        schedule = {
            "schedule_id": schedule_id,
            "video_filename": video_filename,
            "caption": caption,
            "schedule_time": schedule_time.isoformat(),
            "account_id": account_id,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "status": "pending"
        }

        schedules = self._load()
        schedules.append(schedule)
        self._save(schedules)

        logger.info(f"✅ Schedule added: {schedule_id}")
        return schedule_id

    def get_all_schedules(self) -> List[dict]:
        """Return all schedules"""
        return self._load()

    def delete_schedule(self, schedule_id: str):
        """Delete schedule by ID"""
        schedules = self._load()
        schedules = [s for s in schedules if s.get("schedule_id") != schedule_id]
        self._save(schedules)
        logger.info(f"✅ Schedule deleted: {schedule_id}")

async def cut_series_job(video_filename: str, clip_length_sec: int = 60, tiktok_manager=None, account_id: str = None):
    """Cut long video into clips and optionally upload to TikTok

    Args:
        video_filename: путь до исходного видео (mp4)
        clip_length_sec: длина каждого клипа в секундах
        tiktok_manager: менеджер TikTok для загрузки
        account_id: аккаунт TikTok для загрузки
    """

    logger.info(f"▶️ Starting cut_series_job for {video_filename}")

    src = Path(video_filename)
    if not src.exists():
        logger.error(f"Source file not found: {src}")
        return

    try:
        # Получить длительность видео через ffprobe
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(src),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"ffprobe error: {result.stderr}")
            return

        duration = float(result.stdout.strip())
        logger.info(f"Duration={duration}s, clip={clip_length_sec}s")

        # Количество клипов
        num_clips = int(duration // clip_length_sec) + 1
        logger.info(f"Will create {num_clips} clips")

        output_files = []

        for i in range(num_clips):
            start_time = i * clip_length_sec
            if start_time >= duration:
                break

            clip_name = f"{src.stem}_part_{i+1:03d}{src.suffix}"
            clip_path = src.parent / clip_name

            cmd = [
                "ffmpeg",
                "-ss", str(start_time),
                "-t", str(clip_length_sec),
                "-i", str(src),
                "-c", "copy",
                str(clip_path),
            ]

            logger.info(f"⏳ Creating clip: {clip_name} (start={start_time})")
            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode != 0:
                logger.error(f"ffmpeg error for {clip_name}: {result.stderr}")
                continue

            output_files.append(clip_path)
            logger.info(f"✅ Clip created: {clip_name}")

        logger.info(f"✅ Job completed: created {len(output_files)} clips")

    except Exception as e:
        logger.error(f"❌ cut_series_job error: {e}")
