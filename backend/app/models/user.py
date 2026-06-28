"""
User model.
Stores admin and customer accounts.
"""

from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash

from app.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String(80),  unique=True, nullable=False, index=True)
    email         = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role          = db.Column(db.String(20),  nullable=False, default="customer")  # admin | customer
    created_at    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at    = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    bookings = db.relationship("Booking", back_populates="user", lazy="dynamic", cascade="all, delete-orphan")

    # ── Constraints ───────────────────────────────────────────────────────
    __table_args__ = (
        db.CheckConstraint("role IN ('admin', 'customer')", name="ck_users_role"),
    )

    # ── Password helpers ──────────────────────────────────────────────────
    def set_password(self, password: str) -> None:
        """Hash and store a plain-text password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify a plain-text password against the stored hash."""
        return check_password_hash(self.password_hash, password)

    # ── Serialisation ─────────────────────────────────────────────────────
    def to_dict(self, include_private: bool = False) -> dict:
        data = {
            "id":         self.id,
            "username":   self.username,
            "email":      self.email,
            "role":       self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        return data

    def __repr__(self) -> str:
        return f"<User {self.username} ({self.role})>"
