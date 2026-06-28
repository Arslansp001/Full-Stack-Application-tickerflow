"""
Configuration classes.
Loaded by the application factory via get_config().
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class BaseConfig:
    """Shared settings for all environments."""

    # Flask
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-prod")
    JSON_SORT_KEYS: bool = False

    # SQLAlchemy
    SQLALCHEMY_DATABASE_URI: str = os.environ.get("DATABASE_URL", "")
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        "pool_pre_ping": True,          # reconnect on stale connections
        "pool_size": 10,
        "max_overflow": 20,
        "pool_recycle": 300,            # recycle connections every 5 min
    }

    # JWT
    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "jwt-secret-change-in-prod")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES", 3600))
    )

    # CORS
    CORS_ORIGINS = [
        o.strip()
        for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
        if o.strip()
    ]


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    SQLALCHEMY_ECHO = True          # log SQL queries in dev


class ProductionConfig(BaseConfig):
    DEBUG = False
    SQLALCHEMY_ECHO = False


class TestingConfig(BaseConfig):
    TESTING = True
    DEBUG = True
    # Override in tests with an in-process PostgreSQL or test DB
    SQLALCHEMY_DATABASE_URI = os.environ.get("TEST_DATABASE_URL", BaseConfig.SQLALCHEMY_DATABASE_URI)


_CONFIG_MAP = {
    "development": DevelopmentConfig,
    "production":  ProductionConfig,
    "testing":     TestingConfig,
}


def get_config(name: str = None):
    """Return the appropriate config class."""
    env = name or os.environ.get("FLASK_ENV", "production")
    return _CONFIG_MAP.get(env, ProductionConfig)
