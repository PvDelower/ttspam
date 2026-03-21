import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    def __init__(self):
        self.STORAGE_PATH = os.getenv('STORAGE_PATH', 'storage')
        self.MAX_FILE_SIZE = int(os.getenv('MAX_FILE_SIZE', '104857600'))  # 100MB
        self.ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
        self.TIKTOK_USERNAME = os.getenv('TIKTOK_USERNAME', '')
        self.TIKTOK_PASSWORD = os.getenv('TIKTOK_PASSWORD', '')
        self.LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
        self.PROCESSING_TIMEOUT = int(os.getenv('PROCESSING_TIMEOUT', '300'))  # 5 минут
        
    @property
    def tiktok_credentials(self):
        return {
            'username': self.TIKTOK_USERNAME,
            'password': self.TIKTOK_PASSWORD
        }