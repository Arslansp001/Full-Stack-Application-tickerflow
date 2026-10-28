# TicketFlow

## Production Docker Compose

The Compose stack runs exactly two application containers: a React frontend
served by Nginx and a private Flask API. Nginx proxies `/api` to the backend,
so the API port is not published to the host. PostgreSQL remains separately
managed on the external `ticketflow-net` network.

```bash
# Create the shared database network once, if it does not already exist.
docker network create ticketflow-net

# Create the backend runtime secrets and database connection settings.
cp backend/.env.example backend/.env
# Edit backend/.env: set DATABASE_URL, SECRET_KEY, and JWT_SECRET_KEY.

# Optional host-level settings (port and external network name).
cp .env.compose.example .env.compose

docker compose --env-file .env.compose up --build -d
```

Open `http://localhost`. Check status with `docker compose ps`, and view
logs with `docker compose logs -f`. The backend has no public host port; use
`docker compose exec backend flask --app manage init_db` to initialize its
database after PostgreSQL is reachable.
## Ubuntu VM cloud test

The default Compose configuration publishes only port 80 from the frontend.
Allow inbound TCP 80 (and SSH only from trusted IPs) in the VM firewall and
cloud security group. Do **not** expose port 5000 or PostgreSQL.

1. Clone the repository onto the VM, create `backend/.env` from its example,
   and set a reachable `DATABASE_URL`. Use a managed PostgreSQL service or an
   existing PostgreSQL container connected to `ticketflow-net`; the Compose
   stack intentionally starts only the frontend and backend containers.
2. Set `SECRET_KEY` and `JWT_SECRET_KEY` to different random values, for
   example with `openssl rand -hex 32`.
3. Create the external network once when PostgreSQL is a Docker container:
   `docker network create ticketflow-net`.
4. Start the services with `docker compose --env-file .env.compose up --build -d`.
   Then initialize the schema: `docker compose exec backend flask --app manage init_db`.

For an IP-address test, browse to `http://<VM_PUBLIC_IP>`. When moving to a
domain and TLS, place a managed load balancer or host-level TLS proxy in front
of port 80 and set `CORS_ORIGINS` to the public `https://` URL if clients will
call the API directly.
