import logging
import os
from logging.handlers import RotatingFileHandler
from typing import Optional
from datetime import datetime
from config import settings


class CustomFormatter(logging.Formatter):
    def format(self, record):
        if not record.funcName or record.funcName == "<module>":
            self._style._fmt = "%(asctime)s - %(name)s - %(levelname)s - %(module)s:%(lineno)d: %(message)s"
        else:
            self._style._fmt = "%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s] %(message)s"
        return super().format(record)


class Logger:
    _instance = None

    @staticmethod
    def get_logger(
        logger_name: str = "Logger",  # Allow customization of logger name
        log_to_file: bool = settings.DEBUG or False,
        log_file_dir: Optional[str] = "logs",
        max_file_size: int = 5 * 1024 * 1024,
        backup_count: int = 3,
        log_level: int = logging.DEBUG,
    ):
        """Get the global logger instance."""
        if Logger._instance is None:
            Logger(
                logger_name=logger_name,
                log_to_file=log_to_file,
                log_file_dir=log_file_dir,
                max_file_size=max_file_size,
                backup_count=backup_count,
                log_level=log_level,
            )
        return Logger._instance

    def __init__(
        self,
        logger_name: str = "Logger",
        log_to_file: bool = settings.DEBUG or False,
        log_file_dir: Optional[str] = "logs",
        max_file_size: int = 5 * 1024 * 1024,
        backup_count: int = 3,
        log_level: int = logging.DEBUG,
    ):
        """Initialize the logger."""
        if Logger._instance is not None:
            raise Exception("Logger is a singleton class. Use Logger.get_logger() to access the logger.")

        # Configure the logger
        logger = logging.getLogger(logger_name)  # Use the custom logger name
        logger.setLevel(log_level)

        # Create console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        logger.addHandler(console_handler)

        # Optionally create file handler
        if log_to_file and log_file_dir:
            # Ensure the directory for the log file exists
            if not os.path.exists(log_file_dir):
                os.makedirs(log_file_dir, exist_ok=True)

            # Generate log file name with the current date
            current_date = datetime.now().strftime("%Y-%m-%d")
            log_file_path = os.path.join(log_file_dir, f"{current_date}_backend.log")

            # Create file handler
            file_handler = RotatingFileHandler(
                log_file_path, maxBytes=max_file_size, backupCount=backup_count
            )
            file_handler.setLevel(log_level)
            logger.addHandler(file_handler)

            # Create formatter and add it to handlers
            formatter = CustomFormatter()
            console_handler.setFormatter(formatter)
            file_handler.setFormatter(formatter)

        # Assign the logger instance
        Logger._instance = logger
