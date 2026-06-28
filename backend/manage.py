"""
CLI management commands.

Usage:
  python manage.py init_db    — create all tables
  python manage.py seed_db    — insert demo data
  python manage.py drop_db    — drop all tables (dev only)
"""

import click
from app import create_app
from app.extensions import db
from app.models import User, Event, Booking   # noqa: F401 — import to register with SQLAlchemy


app = create_app()


@app.cli.command("init_db")
def init_db():
    """Create all database tables."""
    with app.app_context():
        db.create_all()
        click.echo("✅  Database tables created.")


@app.cli.command("seed_db")
def seed_db():
    """Insert demo users and events."""
    with app.app_context():
        if User.query.count() > 0:
            click.echo("⚠️   Database already seeded — skipping.")
            return

        # Admin user
        admin = User(username="admin", email="admin@ticketflow.io", role="admin")
        admin.set_password("Admin1234!")

        # Customer user
        customer = User(username="sara", email="sara@example.com", role="customer")
        customer.set_password("Customer1234!")

        db.session.add_all([admin, customer])

        # Events
        from datetime import datetime, timezone
        events = [
            Event(title="Neon Rave Night",   description="Dubai's biggest electronic night.", date=datetime(2026, 7, 12, 22, 0, tzinfo=timezone.utc), venue="Pulse Arena, Dubai",          price=85,  capacity=500),
            Event(title="Tech Summit 2026",  description="Annual tech conference.",            date=datetime(2026, 7, 18,  9, 0, tzinfo=timezone.utc), venue="Dubai Convention Centre",    price=250, capacity=1200),
            Event(title="Jazz Under Stars",  description="Open-air jazz evening.",             date=datetime(2026, 7, 25, 20, 0, tzinfo=timezone.utc), venue="Creek Harbour Amphitheatre", price=120, capacity=300),
            Event(title="Street Food Fest",  description="Food from 40+ countries.",           date=datetime(2026, 8,  2, 12, 0, tzinfo=timezone.utc), venue="La Mer, Jumeirah",           price=30,  capacity=2000),
            Event(title="Comedy Night Out",  description="Stand-up comedy showcase.",          date=datetime(2026, 8,  9, 21, 0, tzinfo=timezone.utc), venue="The Laugh Factory, JBR",    price=70,  capacity=200),
        ]
        db.session.add_all(events)
        db.session.commit()

        click.echo("✅  Demo data seeded.")
        click.echo("    admin@ticketflow.io / Admin1234!")
        click.echo("    sara@example.com    / Customer1234!")


@app.cli.command("drop_db")
@click.confirmation_option(prompt="⚠️  This will DROP all tables. Are you sure?")
def drop_db():
    """Drop all database tables. Development only."""
    with app.app_context():
        db.drop_all()
        click.echo("🗑️   All tables dropped.")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
