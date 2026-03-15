# hungerjet-devops-microservice

Microservices demo project using Node.js, Docker Compose, and Nginx.

![CI/CD Pipeline](https://github.com/nimashag/hungerjet-devops-microservice/actions/workflows/ci-cd.yml/badge.svg)

## Quick Links

- [CI/CD Setup Guide](CI-CD-SETUP.md)
- [Testing Guide](README-TESTING.md)
- [SonarQube CI/CD Guide](README-SONARQUBE-CICD.md)
- [Users API Contract](users-service/docs/openapi.yaml)
- [Orders API Contract](orders-service/docs/openapi.yaml)
- [Restaurants API Contract](restaurants-service/docs/openapi.yaml)
- [Delivery API Contract](delivery-service/docs/openapi.yaml)
---

## Prerequisites

- Docker Desktop installed: https://docs.docker.com/desktop/
- Docker Compose (included with Docker Desktop)

---

## Run Application (Docker Compose + Nginx)

```bash
chmod +x runner_docker.sh

# Rebuild all Docker images
./runner_docker.sh rebuild

# Start all services (detached)
./runner_docker.sh start

# Stop all services
./runner_docker.sh stop

# Rebuild + start
./runner_docker.sh up

# Restart all
./runner_docker.sh stop up

# Follow logs for one service
./runner_docker.sh logs orders

# Open shell inside one container
./runner_docker.sh exec orders
```

Nginx gateway runs at:

- API gateway: http://localhost:31000
- Frontend: http://localhost:30000

---

## Test APIs

Swagger docs endpoints:

- Users: http://localhost:31000/api/auth/docs
- Orders: http://localhost:31000/api/orders/docs
- Restaurants: http://localhost:31000/api/restaurants/docs
- Delivery: http://localhost:31000/api/delivery/docs

Raw OpenAPI YAML endpoints:

- Users: http://localhost:31000/api/auth/openapi.yaml
- Orders: http://localhost:31000/api/orders/openapi.yaml
- Restaurants: http://localhost:31000/api/restaurants/openapi.yaml
- Delivery: http://localhost:31000/api/delivery/openapi.yaml

### Restaurants API

```bash
curl -X POST http://localhost:31000/api/restaurants/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Pizza Palace"}'

curl http://localhost:31000/api/restaurants/
./runner_docker.sh logs restaurants
```

### Orders API

```bash
curl -X POST http://localhost:31000/api/orders/ \
  -H "Content-Type: application/json" \
  -d '{
    "product": "Large Pizza",
    "quantity": 2,
    "price": 100,
    "customerId": "john.doe"
  }'

curl http://localhost:31000/api/orders/
./runner_docker.sh logs orders
```

### Frontend

```bash
curl http://localhost:30000/
./runner_docker.sh logs frontend
```

---

## Testing

Backend test folder convention:

```text
src/tests/
  api/    # API/integration-style endpoint tests
  db/     # DB/service tests with model mocks (when applicable)
  unit/   # Unit tests for controllers, middleware, services
```

Current service layouts:

- users-service/src/tests/unit
- restaurants-service/src/tests/api
- restaurants-service/src/tests/db
- restaurants-service/src/tests/unit
- orders-service/src/tests/api
- orders-service/src/tests/unit
- delivery-service/src/tests/unit

Run tests per service:

```bash
cd users-service && npm test -- --watchAll=false
cd restaurants-service && npm test -- --watchAll=false
cd orders-service && npm test -- --watchAll=false
cd delivery-service && npm test -- --watchAll=false
```

Run all backend service tests from repository root:

```bash
for d in users-service restaurants-service orders-service delivery-service; do
  echo "===== $d ====="
  (cd "$d" && npm test -- --watchAll=false)
done
```

---

## Adding a New Service (Compose Setup)

1. Create a new service folder named {prefix}-service with a Dockerfile.
2. Add a record to services.config.json:

```json
{
  "name": "{prefix}-service",
  "prefix": "{prefix}",
  "folder": "{prefix}-service",
  "port": 3005,
  "dockerImage": "my-app/{prefix}-service:latest"
}
```

3. Add the service to docker/docker-compose.yml:

```yaml
  {prefix}-service:
    image: my-app/{prefix}-service:latest
    container_name: {prefix}-service
    ports:
      - "3100X:3005"
    networks:
      - app-network
    restart: unless-stopped
```

4. Add routing to docker/nginx.conf:

```nginx
location /api/{prefix} {
  proxy_pass http://{prefix}-service:3005;
}
```

5. Restart:

```bash
./runner_docker.sh up
```

---

## Docker Compose Troubleshooting

```bash
# View all running services
docker-compose -f docker/docker-compose.yml ps

# View logs (all services)
docker-compose -f docker/docker-compose.yml logs

# View logs (single service)
docker-compose -f docker/docker-compose.yml logs <service-name>

# Follow logs
docker-compose -f docker/docker-compose.yml logs -f <service-name>

# Enter container shell
docker-compose -f docker/docker-compose.yml exec <service-name> sh

# Stop and remove containers/networks/volumes
docker-compose -f docker/docker-compose.yml down -v

# Rebuild one service
docker-compose -f docker/docker-compose.yml build <service-name>
```
