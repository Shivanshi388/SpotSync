# SpotSync Testing and Release Guide

## 1. Prerequisites

- Python installed with the project backend dependencies.
- Node.js and npm available.
- A configured backend `.env` file with the required database, JWT and payment settings.
- A running database and any required schema migrations.
- MQTT broker configuration if testing sensor integration.

Never commit real credentials or production secrets.

## 2. Run the backend

From the repository root:

```powershell
cd backend
python -m uvicorn app.main:app --reload
```

Check the API at:
- Health endpoint: `/health` (verify the actual route in the project).
- Interactive API documentation: `http://127.0.0.1:8000/docs`

## 3. Run backend tests

From the repository root:

```powershell
cd backend
python -m pytest -q
```

Latest recorded result: **9 passed**.

The tests cover existing availability-service cases and admin permission checks. This result does not establish that the complete booking and payment lifecycle has been tested.

## 4. Build the frontend

From the repository root:

```powershell
cd frontend
npm.cmd run build
```

Latest recorded result: **Vite production build succeeded**.

## 5. Frontend linting

Run:

```powershell
npm.cmd run lint
```

Current limitation: the command failed because `eslint` was not recognized. Check the frontend development dependencies and lockfile, install dependencies using the project's documented package manager, and rerun linting. Do not mark lint as passed until it succeeds.

## 6. Manual verification checklist

- [ ] Start the backend with a valid environment configuration.
- [ ] Start the frontend using `npm.cmd run dev`.
- [ ] Confirm parking locations and slot counts match backend responses.
- [ ] Confirm analytics are loaded from backend endpoints.
- [ ] Check booking totals, payment totals and refunds against database records.
- [ ] Check saved prediction history and verify the chart uses actual returned records.
- [ ] Verify unauthenticated requests and non-admin access to protected admin endpoints.
- [ ] Test booking creation, cancellation and overlapping booking attempts.
- [ ] Test failed payments and verify unsuccessful payments are not counted as successful revenue.
- [ ] Test missing, invalid and disconnected sensor data.
- [ ] Verify the application using a fresh database and the project's migration/setup procedure.
- [ ] Check browser console, backend logs and API responses for errors.

## 7. Release checklist

- [ ] Backend tests pass.
- [ ] Frontend production build succeeds.
- [ ] Frontend lint succeeds.
- [ ] Environment variables and secrets are configured securely.
- [ ] Database setup and migrations are reproducible.
- [ ] Deployment configuration is verified.
- [ ] Deployed frontend and backend are tested together.
- [ ] Known limitations and outstanding tests are documented.

## 8. Current status

Verified:
- Backend test suite: 9 passed.
- Frontend production build: succeeded.

Outstanding:
- Frontend linting.
- End-to-end booking lifecycle tests.
- Concurrent booking and failed-payment tests.
- Sensor-disconnection tests.
- Full admin endpoint authorization verification.
- Fresh-database and deployed-environment verification.
