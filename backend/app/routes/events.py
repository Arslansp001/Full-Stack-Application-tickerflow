"""
Events routes.

GET    /api/events       — list all events (public)
POST   /api/events       — create event (admin only)
GET    /api/events/<id>  — get single event (public)
PUT    /api/events/<id>  — update event (admin only)
DELETE /api/events/<id>  — delete event (admin only)
"""

from datetime import datetime
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.event import Event
from app.middleware.auth import admin_required

events_bp = Blueprint("events", __name__)


def _parse_event_body(data: dict, partial: bool = False) -> tuple[dict, dict]:
    """
    Validate and extract event fields.
    Returns (fields_dict, errors_dict).
    """
    fields = {}
    errors = {}

    if "title" in data or not partial:
        title = (data.get("title") or "").strip()
        if not title:
            errors["title"] = "Required"
        else:
            fields["title"] = title

    if "venue" in data or not partial:
        venue = (data.get("venue") or "").strip()
        if not venue:
            errors["venue"] = "Required"
        else:
            fields["venue"] = venue

    if "date" in data or not partial:
        raw_date = data.get("date", "")
        if not raw_date:
            errors["date"] = "Required"
        else:
            try:
                fields["date"] = datetime.fromisoformat(str(raw_date).replace("Z", "+00:00"))
            except ValueError:
                errors["date"] = "Invalid ISO 8601 date (e.g. 2026-07-12T22:00:00)"

    if "price" in data or not partial:
        try:
            price = float(data.get("price", -1))
            if price < 0:
                raise ValueError
            fields["price"] = price
        except (TypeError, ValueError):
            errors["price"] = "Must be a non-negative number"

    if "capacity" in data or not partial:
        try:
            capacity = int(data.get("capacity", 0))
            if capacity <= 0:
                raise ValueError
            fields["capacity"] = capacity
        except (TypeError, ValueError):
            errors["capacity"] = "Must be a positive integer"

    if "description" in data:
        fields["description"] = data.get("description", "")

    return fields, errors


# ── List events ───────────────────────────────────────────────────────────
@events_bp.get("/events")
def list_events():
    page     = request.args.get("page",     1,    type=int)
    per_page = request.args.get("per_page", 20,   type=int)
    search   = request.args.get("search",   "",   type=str).strip()

    query = Event.query.order_by(Event.date.asc())

    if search:
        query = query.filter(
            Event.title.ilike(f"%{search}%") | Event.venue.ilike(f"%{search}%")
        )

    paginated = query.paginate(page=page, per_page=min(per_page, 100), error_out=False)

    return jsonify({
        "events":  [e.to_dict() for e in paginated.items],
        "total":   paginated.total,
        "page":    paginated.page,
        "pages":   paginated.pages,
        "per_page": paginated.per_page,
    }), 200


# ── Get single event ──────────────────────────────────────────────────────
@events_bp.get("/events/<int:event_id>")
def get_event(event_id: int):
    event = db.session.get(Event, event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404
    return jsonify({"event": event.to_dict()}), 200


# ── Create event (admin) ──────────────────────────────────────────────────
@events_bp.post("/events")
@admin_required
def create_event():
    data = request.get_json(silent=True) or {}
    fields, errors = _parse_event_body(data, partial=False)

    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 422

    event = Event(**fields)
    db.session.add(event)
    db.session.commit()

    return jsonify({"message": "Event created", "event": event.to_dict()}), 201


# ── Update event (admin) ──────────────────────────────────────────────────
@events_bp.put("/events/<int:event_id>")
@admin_required
def update_event(event_id: int):
    event = db.session.get(Event, event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404

    data = request.get_json(silent=True) or {}
    fields, errors = _parse_event_body(data, partial=True)

    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 422

    for key, value in fields.items():
        setattr(event, key, value)

    db.session.commit()
    return jsonify({"message": "Event updated", "event": event.to_dict()}), 200


# ── Delete event (admin) ──────────────────────────────────────────────────
@events_bp.delete("/events/<int:event_id>")
@admin_required
def delete_event(event_id: int):
    event = db.session.get(Event, event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404

    db.session.delete(event)
    db.session.commit()

    return jsonify({"message": f"Event {event_id} deleted"}), 200
