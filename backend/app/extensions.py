"""
Shared extension instances.
Initialised in create_app() to avoid circular imports.
"""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
