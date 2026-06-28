"""
TicketFlow Backend
Flask application factory.
"""

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

from app.extensions import db
from app.config import get_config


migrate = Migrate()
jwt = JWTManager()


def create_app(config_name: str = None) -> Flask:
    """
    Create and configure the Flask application.
    Uses the Application Factory pattern for flexibility and testability.
    """
    app = Flask(__name__)

    # ── Config ────────────────────────────────────────────────────────────
    config = get_config(config_name)
    app.config.from_object(config)

    # ── Extensions ────────────────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    CORS(
        app,
        origins=app.config.get("CORS_ORIGINS", "*"),
        supports_credentials=True,
    )

    # ── Register blueprints ───────────────────────────────────────────────
    from app.routes.auth import auth_bp
    from app.routes.events import events_bp
    from app.routes.bookings import bookings_bp

    app.register_blueprint(auth_bp,     url_prefix="/api")
    app.register_blueprint(events_bp,   url_prefix="/api")
    app.register_blueprint(bookings_bp, url_prefix="/api")

    # ── Health check ──────────────────────────────────────────────────────
    @app.get("/health")
    def health():
        return {"status": "ok", "service": "ticketflow-backend"}, 200

    return app
