from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration. Every value can be overridden with an environment variable."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./data/app.db"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    solver: str = "greedy"  # greedy | ortools | auto
    llm_enabled: bool = False
    api_port: int = 8000
    max_upload_bytes: int = 5 * 1024 * 1024  # 5 MB per CSV


settings = Settings()


def get_cors_origins() -> list[str]:
    return [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
