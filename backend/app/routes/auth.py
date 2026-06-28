"""
Auth routes.

POST /api/register  — create a new customer account
POST /api/login     — authenticate and return JWT
GET  /api/me        — return current user profile (JWT required)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, get_jwt_identity
from app.extensions import db
from app.models.user import User
from app.middleware.auth import jwt_required_custom

auth_bp = Blueprint("auth", __name__)


# ── Register ──────────────────────────────────────────────────────────────
@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}

    username = (data.get("username") or "").strip()
    email    = (data.get("email")    or "").strip().lower()
    password = data.get("password", "")
    role     = data.get("role", "customer")

    # Validation
    errors = {}
    if not username:
        errors["username"] = "Required"
    if not email:
        errors["email"] = "Required"
    if len(password) < 8:
        errors["password"] = "Must be at least 8 characters"
    if role not in ("admin", "customer"):
        errors["role"] = "Must be 'admin' or 'customer'"
    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 422

    # Uniqueness check
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already taken"}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(username=username, email=email, role=role)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role},
    )

    return jsonify({
        "message": "Account created",
        "token":   token,
        "user":    user.to_dict(),
    }), 201


# ── Login ─────────────────────────────────────────────────────────────────
@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}

    email    = (data.get("email")    or "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role},
    )

    return jsonify({
        "message": "Login successful",
        "token":   token,
        "user":    user.to_dict(),
    }), 200


# ── Current user ──────────────────────────────────────────────────────────
@auth_bp.get("/me")
@jwt_required_custom
def me():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"user": user.to_dict()}), 200
