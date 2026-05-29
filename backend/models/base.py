"""
Base configuration for SQLAlchemy models.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database configuration
#IF POSTGRESQL
#  DATABASE_URL = "postgresql://user:password@localhost:5432/mydatabase"
#IF MYSQL
#  DATABASE_URL = "mysql+pymysql://user:password@localhost/mydatabase"

#IF SQLITE
DATABASE_URL = f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database.db')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models
Base = declarative_base()
