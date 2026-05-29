"""部署用：只在資料庫為空時灌入示範資料（idempotent，重啟不會重複）。

執行順序刻意放在啟動 app 之前，因此這裡會先確保資料表存在。
"""
import os
import sys
import subprocess

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPTS_DIR = os.path.join(BACKEND_DIR, "scripts")
sys.path.insert(0, BACKEND_DIR)

from database import engine, Base, SessionLocal  # noqa: E402
import models  # noqa: E402,F401  # 註冊所有 ORM models 到 Base
from schemas.product_schema import Product  # noqa: E402

# 先建立資料表（app 尚未啟動，否則 seed 會因找不到資料表而失敗）
Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    count = db.query(Product).count()
finally:
    db.close()

if count > 0:
    print(f"[seed] 資料庫已有 {count} 筆商品 — 略過 seeding。")
else:
    print("[seed] 資料庫為空 — 開始灌入示範資料…")
    subprocess.run([sys.executable, "seed_data.py", "50"], cwd=SCRIPTS_DIR, check=False)
    subprocess.run([sys.executable, "seed_interactions.py", "all"], cwd=SCRIPTS_DIR, check=False)
    print("[seed] 完成。")
