"""
Event model.
Represents a ticketed event on the platform.
"""

from datetime import datetime, timezone
from app.extensions import db


class Event(db.Model):
    __tablename__ = "events"

    id          = db.Column(db.Integer, primary_key=True)
    title       = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text,        nullable=True)
    date        = db.Column(db.DateTime,    nullable=False)
    venue       = db.Column(db.String(200), nullable=False)
    price       = db.Column(db.Numeric(10, 2), nullable=False)
    capacity    = db.Column(db.Integer,     nullable=False)
    created_at  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at  = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    bookings = db.relationship("Booking", back_populates="event", lazy="dynamic", cascade="all, delete-orphan")

    # ── Constraints ───────────────────────────────────────────────────────
    __table_args__ = (
        db.CheckConstraint("price >= 0",    name="ck_events_price_positive"),
        db.CheckConstraint("capacity > 0",  name="ck_events_capacity_positive"),
    )

    # ── Computed properties ───────────────────────────────────────────────
    @property
    def tickets_sold(self) -> int:
        """Total tickets booked for this event."""
        from sqlalchemy import func
        from app.models.booking import Booking
        result = db.session.query(func.coalesce(func.sum(Booking.quantity), 0)) \
                           .filter(Booking.event_id == self.id).scalar()
        return int(result)

    @property
    def tickets_available(self) -> int:
        return self.capacity - self.tickets_sold

    @property
    def is_sold_out(self) -> bool:
        return self.tickets_available <= 0

    # ── Serialisation ─────────────────────────────────────────────────────
    def to_dict(self) -> dict:
        return {
            "id":                self.id,
            "title":             self.title,
            "description":       self.description,
            "date":              self.date.isoformat() if self.date else None,
            "venue":             self.venue,
            "price":             float(self.price),
            "capacity":          self.capacity,
            "tickets_sold":      self.tickets_sold,
            "tickets_available": self.tickets_available,
            "is_sold_out":       self.is_sold_out,
            "created_at":        self.created_at.isoformat() if self.created_at else None,
            "updated_at":        self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f"<Event {self.id}: {self.title}>"
