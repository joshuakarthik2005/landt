"""
Configuration management for Formula Intelligence backend.
Loads settings from environment variables with sensible defaults.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Formula Intelligence"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://localhost:8001"]
    
    # File Upload
    MAX_FILE_SIZE_MB: int = 100
    UPLOAD_DIR: str = "./uploads"
    ALLOWED_EXTENSIONS: set[str] = {".xlsx", ".xlsm", ".xls"}
    
    # Processing
    MAX_WORKERS: int = 8
    ENABLE_MULTIPROCESSING: bool = True
    CHUNK_SIZE: int = 10000
    
    # Graph Settings
    MAX_NODES_RENDER: int = 10000
    ENABLE_CLUSTERING: bool = True
    CENTRALITY_THRESHOLD: float = 0.1
    
    # Cache
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    CACHE_TTL: int = 3600  # 1 hour
    ENABLE_CACHE: bool = True
    
    # Database (for future use)
    DATABASE_URL: Optional[str] = None
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # json or text
    
    # GNN Model
    GNN_MODEL_PATH: str = "./models/anomaly_detector.pt"
    GNN_THRESHOLD: float = 0.7
    ENABLE_GNN: bool = False  # Disabled by default, requires trained model
    
    # Performance
    ENABLE_PROFILING: bool = False
    BENCHMARK_MODE: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Uses lru_cache to ensure settings are loaded only once.
    """
    return Settings()


# Export settings instance
settings = get_settings()
