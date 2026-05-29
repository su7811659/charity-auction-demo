from pydantic_settings import BaseSettings
from dotenv import load_dotenv, dotenv_values
import os

# Load the .env file
load_dotenv()

# 強制覆蓋系統環境中的值
for key, value in dotenv_values(".env").items():
    os.environ[key] = value

class Settings(BaseSettings):
    # 預設值讓專案在沒有 .env 時也能直接啟動（demo 友善）
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    OPENAI_API_KEY: str = ""           # 留空 = Demo 模式（AI 改用示範回應，不呼叫 OpenAI）
    ADMIN_SECRET: str = "demo-admin"   # 管理員 token；正式部署請改成強密碼
    SSO_SERVER_HOST: str = ""          # 已停用 SSO（demo 改用一般登入）
    GOOGLE_SPREADSHEET_ID: str = ""    # 選用：回饋信箱寫入 Google Sheet 時才需要

    class Config:
        env_file = ".env"

# Create an instance of settings for use in other files.
settings = Settings()
