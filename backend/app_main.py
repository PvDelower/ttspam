from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import json
from pathlib import Path
from typing import Optional
import logging
from datetime import datetime

from backend.downloader import VideoDownloader
from backend.processor import VideoProcessor
from backend.models import ProcessRequest, DownloadRequest, EffectsConfig, BannerConfig, TrimConfig
from backend.logger import setup_logger

logger = setup_logger(__name__)

app = FastAPI(title="Video Automation Platform", version="3.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
STORAGE_DIR = Path("storage")
DOWNLOADS_DIR = STORAGE_DIR / "downloads"
OUTPUTS_DIR = STORAGE_DIR / "outputs"
CACHE_DIR = STORAGE_DIR / "cache"

# Create dirs
for dir_path in [DOWNLOADS_DIR, OUTPUTS_DIR, CACHE_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Initialize services
downloader = VideoDownloader(str(DOWNLOADS_DIR))
processor = VideoProcessor(str(STORAGE_DIR))


# ==================== ROUTES ====================

@app.get("/")
async def root():
    """Root endpoint"""
    return JSONResponse({
        "status": "online",
        "version": "3.0",
        "message": "Video Automation System",
        "api_docs": "/docs"
    })


@app.get("/api/status")
async def status():
    """Check API status"""
    return {
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "storage": {
            "downloads": len(list(DOWNLOADS_DIR.glob("*"))),
            "outputs": len(list(OUTPUTS_DIR.glob("*"))),
            "cache": len(list(CACHE_DIR.glob("*")))
        }
    }


@app.post("/api/download")
async def download_video(request: DownloadRequest, background_tasks: BackgroundTasks):
    """Download video from YouTube"""
    try:
        logger.info(f"Downloading: {request.url}")
        
        result = downloader.download(
            url=request.url,
            quality=request.quality
        )
        
        if result["status"] == "success":
            return {
                "status": "success",
                "data": {
                    "file_id": result["file_id"],
                    "filename": result["filename"],
                    "size": result["size"],
                    "duration": result["duration"],
                    "path": f"/api/files/{result['file_id']}"
                }
            }
        else:
            return {
                "status": "error",
                "message": result.get("message", "Download failed")
            }, 400
            
    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/process")
async def process_video(request: ProcessRequest, background_tasks: BackgroundTasks):
    """Process video with effects"""
    try:
        input_file = DOWNLOADS_DIR / request.file_id

        if not input_file.exists():
            raise HTTPException(status_code=404, detail="File not found")

        logger.info(f"Processing: {request.file_id}")

        result = processor.process(
            input_path=str(input_file),
            output_dir=str(OUTPUTS_DIR),
            effects=request.effects.model_dump() if request.effects else None,
            banner=request.banner.model_dump() if request.banner else None,
            trim=request.trim.model_dump() if request.trim else None
        )

        if result["status"] == "success":
            return {
                "status": "success",
                "data": {
                    "output_id": result["output_id"],
                    "filename": result["filename"],
                    "size": result["size"],
                    "path": f"/api/files/{result['output_id']}"
                }
            }
        else:
            return {
                "status": "error",
                "message": result.get("message", "Processing failed")
            }, 400
            
    except Exception as e:
        logger.error(f"Processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/preview")
async def create_preview(file_id: str):
    """Create preview image from video"""
    try:
        input_file = DOWNLOADS_DIR / file_id
        
        if not input_file.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        preview_path = processor.create_preview(
            input_path=str(input_file),
            output_dir=str(CACHE_DIR)
        )
        
        return {
            "status": "success",
            "preview_url": f"/api/preview-image/{Path(preview_path).name}"
        }
        
    except Exception as e:
        logger.error(f"Preview error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/files")
async def list_files(directory: str = "downloads"):
    """List files in directory"""
    try:
        if directory == "downloads":
            dir_path = DOWNLOADS_DIR
        elif directory == "outputs":
            dir_path = OUTPUTS_DIR
        else:
            raise HTTPException(status_code=400, detail="Invalid directory")
        
        files = []
        for file_path in sorted(dir_path.glob("*"), key=os.path.getmtime, reverse=True):
            if file_path.is_file():
                stat = file_path.stat()
                files.append({
                    "id": file_path.name,
                    "name": file_path.name,
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "url": f"/api/download-file/{file_path.name}"
                })
        
        return {
            "status": "success",
            "directory": directory,
            "count": len(files),
            "files": files
        }
        
    except Exception as e:
        logger.error(f"List files error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/download-file/{file_id}")
async def download_file(file_id: str):
    """Download processed file"""
    # Try outputs first, then downloads
    file_path = OUTPUTS_DIR / file_id
    if not file_path.exists():
        file_path = DOWNLOADS_DIR / file_id
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=file_path.name,
        media_type="video/mp4"
    )


@app.get("/api/preview-image/{file_id}")
async def get_preview(file_id: str):
    """Get preview image"""
    file_path = CACHE_DIR / file_id
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Preview not found")
    
    return FileResponse(
        path=file_path,
        media_type="image/png"
    )


@app.delete("/api/files/{file_id}")
async def delete_file(file_id: str):
    """Delete file"""
    try:
        # Try both locations
        for dir_path in [DOWNLOADS_DIR, OUTPUTS_DIR]:
            file_path = dir_path / file_id
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Deleted: {file_id}")
                return {
                    "status": "success",
                    "message": f"File {file_id} deleted"
                }
        
        raise HTTPException(status_code=404, detail="File not found")
        
    except Exception as e:
        logger.error(f"Delete error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/effects")
async def get_effects():
    """Get available effects"""
    return {
        "status": "success",
        "effects": {
            "brightness": {"min": 0.5, "max": 2.0, "default": 1.0},
            "contrast": {"min": 0.5, "max": 2.0, "default": 1.0},
            "saturation": {"min": 0.0, "max": 2.0, "default": 1.0},
            "speed": {"min": 0.5, "max": 2.0, "default": 1.0},
            "blur": {"min": 0, "max": 1, "default": 0},
            "rotate": {"min": 0, "max": 360, "default": 0}
        }
    }


@app.get("/api/config")
async def get_config():
    """Get system config"""
    return {
        "version": "3.0",
        "max_file_size": 500 * 1024 * 1024,  # 500MB
        "supported_formats": ["mp4", "webm", "avi", "mov"],
        "storage": {
            "downloads": str(DOWNLOADS_DIR),
            "outputs": str(OUTPUTS_DIR),
            "cache": str(CACHE_DIR)
        }
    }


# Mount static files (frontend)
if Path("frontend/build").exists():
    app.mount("/", StaticFiles(directory="frontend/build", html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)