"""
WSGI entry point.
Used by Gunicorn in production:
  gunicorn --bind 0.0.0.0:5000 wsgi:app
"""

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run()
