# TicketFlow Backend

Production-grade REST API built with **Python Flask**, **SQLAlchemy**, and **PostgreSQL**.  
Deployed as a Docker container, designed to attach to the `ticketflow-net` bridge network.

---

## Project Structure

```
ticketflow-backend/
├── app/
│   ├── __init__.py          # Application factory (create_app)
│   ├── extensions.py        # Shared SQLAlchemy instance
│   ├── config.py            # Dev / Prod / Test config classes
│   ├── models/
│   │   ├── user.py          # User model
│   │   ├── event.py         # Event model
│   │   └── booking.py       # Booking model
│   ├── routes/
│   │   ├── auth.py          # POST /login, POST /register, GET /me
│   │   ├── events.py        # CRUD /events
│   │   └── bookings.py      # CRUD /bookings
│   └── middleware/
│       └── auth.py          # JWT & admin decorators
├── wsgi.py                  # Gunicorn entry point
├── manage.py                # CLI: init_db, seed_db, drop_db
├── requirements.txt
├── Dockerfile
├── .env.example
└── README.md
```

---

## API Reference

### Auth
| Method | Endpoint        | Auth     | Description             |
|--------|-----------------|----------|-------------------------|
| POST   | `/api/register` | Public   | Create account          |
| POST   | `/api/login`    | Public   | Get JWT token           |
| GET    | `/api/me`       | JWT      | Current user profile    |

### Events
| Method | Endpoint            | Auth     | Description             |
|--------|---------------------|----------|-------------------------|
| GET    | `/api/events`       | Public   | List events (paginated) |
| GET    | `/api/events/<id>`  | Public   | Get single event        |
| POST   | `/api/events`       | Admin    | Create event            |
| PUT    | `/api/events/<id>`  | Admin    | Update event            |
| DELETE | `/api/events/<id>`  | Admin    | Delete event            |

### Bookings
| Method | Endpoint               | Auth     | Description                      |
|--------|------------------------|----------|----------------------------------|
| GET    | `/api/bookings`        | JWT      | List bookings (admin: all, customer: own) |
| GET    | `/api/bookings/<id>`   | JWT      | Get single booking               |
| POST   | `/api/bookings`        | JWT      | Create booking (capacity-guarded)|
| PUT    | `/api/bookings/<id>`   | JWT      | Cancel booking                   |

### Health
| Method | Endpoint   | Auth   | Description    |
|--------|------------|--------|----------------|
| GET    | `/health`  | Public | Health check   |

---

## Quick Start

### 1. Copy and fill environment variables
```bash
cp .env.example .env
# Edit .env with your values
```

### 2. Run PostgreSQL (if not already on the network)
```bash
docker run -d \
  --name ticketflow-postgres \
  --network ticketflow-net \
  -e POSTGRES_USER=ticketflow \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=ticketflow_db \
  -v ticketflow-pgdata:/var/lib/postgresql/data \
  --restart unless-stopped \
  postgres:16-alpine
```

### 3. Build and run the backend
```bash
docker build -t ticketflow-backend .

docker run -d \
  --name ticketflow-backend \
  --network ticketflow-net \
  --env-file .env \
  --restart unless-stopped \
  --memory 256m \
  --cpus 1.0 \
  -p 5000:5000 \
  ticketflow-backend
```

### 4. Initialise the database
```bash
docker exec ticketflow-backend flask --app manage init_db
docker exec ticketflow-backend flask --app manage seed_db
```

---

## Local Development (without Docker)

```bash
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env           # set DATABASE_URL to your local PostgreSQL

flask --app manage init_db
flask --app manage seed_db
flask --app wsgi run --debug
```

---

## Nginx Reverse Proxy (ticketflow-net)

Add to your main Nginx config to proxy the API:

```nginx
location /api/ {
    proxy_pass         http://ticketflow-backend:5000/api/;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 60s;
}
```

---

## Example Requests

**Login**
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ticketflow.io","password":"Admin1234!"}'
```

**Create event (admin)**
```bash
curl -X POST http://localhost:5000/api/events \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Event",
    "venue": "Dubai Arena",
    "date":  "2026-09-01T20:00:00",
    "price": 100,
    "capacity": 500
  }'
```

**Book a ticket**
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"event_id": 1, "quantity": 2}'
```

---

## Useful Commands

```bash
# View logs
docker logs -f ticketflow-backend

# Health check
curl http://localhost:5000/health

# Drop + recreate tables
docker exec ticketflow-backend flask --app manage drop_db
docker exec ticketflow-backend flask --app manage init_db

# Rebuild and redeploy
docker build -t ticketflow-backend:new .
docker stop ticketflow-backend && docker rm ticketflow-backend
docker run -d --name ticketflow-backend --network ticketflow-net --env-file .env ticketflow-backend:new
```

---

## Default Seed Credentials

| Role     | Email                    | Password       |
|----------|--------------------------|----------------|
| Admin    | admin@ticketflow.io      | Admin1234!     |
| Customer | sara@example.com         | Customer1234!  |
