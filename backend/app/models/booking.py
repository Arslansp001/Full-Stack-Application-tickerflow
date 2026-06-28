"""
Booking model.
Links a user to an event with a quantity of tickets.
"""

from datetime import datetime, timezone
from app.extensions import db


class Booking(db.Model):
    __tablename__ = "bookings"

    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey("users.id",  ondelete="CASCADE"), nullable=False, index=True)
    event_id     = db.Column(db.Integer, db.ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity     = db.Column(db.Integer,  nullable=False, default=1)
    total_price  = db.Column(db.Numeric(10, 2), nullable=False)
    status       = db.Column(db.String(20), nullable=False, default="confirmed")  # confirmed | cancelled
    booking_date = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at   = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user  = db.relationship("User",  back_populates="bookings")
    event = db.relationship("Event", back_populates="bookings")

    # ── Constraints ───────────────────────────────────────────────────────
    __table_args__ = (
        db.CheckConstraint("quantity > 0",  name="ck_bookings_quantity_positive"),
        db.CheckConstraint("status IN ('confirmed', 'cancelled')", name="ck_bookings_status"),
    )

    # ── Serialisation ─────────────────────────────────────────────────────
    def to_dict(self) -> dict:
        return {
            "id":           self.id,
            "user_id":      self.user_id,
            "event_id":     self.event_id,
            "quantity":     self.quantity,
            "total_price":  float(self.total_price),
            "status":       self.status,
            "booking_date": self.booking_date.isoformat() if self.booking_date else None,
            "user": {
                "id":       self.user.id,
                "username": self.user.username,
                "email":    self.user.email,
            } if self.user else None,
            "event": {
                "id":    self.event.id,
                "title": self.event.title,
                "date":  self.event.date.isoformat() if self.event.date else None,
                "venue": self.event.venue,
            } if self.event else None,
        }

    def __repr__(self) -> str:
        return f"<Booking {self.id}: user={self.user_id} event={self.event_id} qty={self.quantity}>"
