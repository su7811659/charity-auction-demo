from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os

#IF POSTGRESQL
#  DATABASE_URL = "postgresql://user:password@localhost:5432/mydatabase"
#IF MYSQL
#  DATABASE_URL = "mysql+pymysql://user:password@localhost/mydatabase"

#IF SQLITE
DATABASE_URL = f"sqlite:///{os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')}"

# SQLite 優化配置
engine = create_engine(
    DATABASE_URL, 
    connect_args={
        "check_same_thread": False,
        "timeout": 20  # 20秒超時
    },
    poolclass=StaticPool,  # 使用靜態連接池，適合 SQLite
    pool_pre_ping=True,    # 連接前檢查是否有效
    pool_recycle=3600,     # 1小時回收連接
    echo=False             # 生產環境關閉 SQL logging
)

# 啟用 SQLite WAL 模式和其他優化
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """為每個新連接設置 SQLite 優化參數"""
    cursor = dbapi_connection.cursor()
    # 啟用 WAL 模式，改善並發性能
    cursor.execute("PRAGMA journal_mode=WAL")
    # 同步模式設為 NORMAL，平衡性能和安全性
    cursor.execute("PRAGMA synchronous=NORMAL")
    # 設置較大的 cache size (10MB)
    cursor.execute("PRAGMA cache_size=-10000")
    # 啟用外鍵約束
    cursor.execute("PRAGMA foreign_keys=ON")
    # 設置較短的 busy timeout (5秒)
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declare ORM Base Class
Base = declarative_base()

# Note: Model imports are handled in models/__init__.py to avoid circular imports
# This ensures all models are registered with Base when needed

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create tables (fallback for when not using migrations)
#Base.metadata.create_all(bind=engine)
