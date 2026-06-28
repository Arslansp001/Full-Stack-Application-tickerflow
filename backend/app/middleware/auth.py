"""
Auth middleware / decorators.
Wraps Flask-JWT-Extended with role-based access control.
"""

from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def jwt_required_custom(fn):
    """Require a valid JWT token."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
        except Exception as e:
            return jsonify({"error": "Unauthorised", "message": str(e)}), 401
        return fn(*args, **kwargs)
    return wrapper


def admin_required(fn):
    """Require a valid JWT token with role=admin."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
        except Exception as e:
            return jsonify({"error": "Unauthorised", "message": str(e)}), 401

        claims = get_jwt()
        if claims.get("role") != "admin":
            return jsonify({"error": "Forbidden", "message": "Admin access required"}), 403

        return fn(*args, **kwargs)
    return wrapper
