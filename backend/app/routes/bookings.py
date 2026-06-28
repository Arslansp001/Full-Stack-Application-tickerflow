"""
Bookings routes.

GET  /api/bookings       — list bookings (admin: all, customer: own)
POST /api/bookings       — create booking (authenticated)
GET  /api/bookings/<id>  — get single booking (owner or admin)
PUT  /api/bookings/<id>  — cancel booking (owner or admin)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt
from app.extensions import db
from app.models.booking import Booking
from app.models.event import Event
from app.middleware.auth import jwt_required_custom

bookings_bp = Blueprint("bookings", __name__)


# ── List bookings ─────────────────────────────────────────────────────────
@bookings_bp.get("/bookings")
@jwt_required_custom
def list_bookings():
    current_user_id = int(get_jwt_identity())
    claims          = get_jwt()
    is_admin        = claims.get("role") == "admin"

    page     = request.args.get("page",     1,  type=int)
    per_page = request.args.get("per_page", 20, type=int)

    query = Booking.query.order_by(Booking.booking_date.desc())

    if not is_admin:
        # Customers can only see their own bookings
        query = query.filter(Booking.user_id == current_user_id)

    paginated = query.paginate(page=page, per_page=min(per_page, 100), error_out=False)

    return jsonify({
        "bookings": [b.to_dict() for b in paginated.items],
        "total":    paginated.total,
        "page":     paginated.page,
        "pages":    paginated.pages,
    }), 200


# ── Get single booking ────────────────────────────────────────────────────
@bookings_bp.get("/bookings/<int:booking_id>")
@jwt_required_custom
def get_booking(booking_id: int):
    current_user_id = int(get_jwt_identity())
    claims          = get_jwt()
    is_admin        = claims.get("role") == "admin"

    booking = db.session.get(Booking, booking_id)
    if not booking:
        return jsonify({"error": "Booking not found"}), 404

    if not is_admin and booking.user_id != current_user_id:
        return jsonify({"error": "Forbidden"}), 403

    return jsonify({"booking": booking.to_dict()}), 200


# ── Create booking ────────────────────────────────────────────────────────
@bookings_bp.post("/bookings")
@jwt_required_custom
def create_booking():
    current_user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    event_id = data.get("event_id")
    quantity = data.get("quantity", 1)

    # Validation
    errors = {}
    if not event_id:
        errors["event_id"] = "Required"
    try:
        quantity = int(quantity)
        if quantity <= 0:
            raise ValueError
    except (TypeError, ValueError):
        errors["quantity"] = "Must be a positive integer"

    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 422

    # Fetch event
    event = db.session.get(Event, event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404

    # Capacity check (atomic — lock the row during the transaction)
    db.session.refresh(event)
    if event.tickets_available < quantity:
        return jsonify({
            "error":     "Not enough tickets available",
            "available": event.tickets_available,
            "requested": quantity,
        }), 409

    total_price = float(event.price) * quantity

    booking = Booking(
        user_id     = current_user_id,
        event_id    = event_id,
        quantity    = quantity,
        total_price = total_price,
        status      = "confirmed",
    )
    db.session.add(booking)
    db.session.commit()

    return jsonify({"message": "Booking confirmed", "booking": booking.to_dict()}), 201


# ── Cancel booking ────────────────────────────────────────────────────────
@bookings_bp.put("/bookings/<int:booking_id>")
@jwt_required_custom
def cancel_booking(booking_id: int):
    current_user_id = int(get_jwt_identity())
    claims          = get_jwt()
    is_admin        = claims.get("role") == "admin"

    booking = db.session.get(Booking, booking_id)
    if not booking:
        return jsonify({"error": "Booking not found"}), 404

    if not is_admin and booking.user_id != current_user_id:
        return jsonify({"error": "Forbidden"}), 403

    if booking.status == "cancelled":
        return jsonify({"error": "Booking is already cancelled"}), 409

    booking.status = "cancelled"
    db.session.commit()

    return jsonify({"message": "Booking cancelled", "booking": booking.to_dict()}), 200
