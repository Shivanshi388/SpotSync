# SpotSync core backend/frontend patch

This patch is a compatibility-oriented first pass, not a declaration that a live production payment account or database has been tested.

## Changes

- Admin analytics requires a valid admin token at the API layer; the frontend admin route also re-fetches `/api/auth/me` before rendering the dashboard.
- `/api/vehicles` is mounted so the booking flow can select or register one of the current user's vehicles.
- Parking details uses real slot records; availability no longer invents individual slot states from aggregate counts.
- Booking creation, order creation, signature verification, booking confirmation, listing and cancellation now use backend APIs rather than browser-only booking records.
- Payment verification updates the related booking to `confirmed` in the same database commit as the payment status.
- Repeated checkout requests reuse an existing unpaid order; verified duplicate callbacks are idempotent for the same values.
- Mock payments/refunds require `APP_ENV=development` and `ALLOW_MOCK_PAYMENTS=true`, and cannot be used in other environments.
- SQL status constraints are aligned with backend refund/payment statuses, and overlapping active reservations are guarded by a PostgreSQL exclusion constraint.
- Vitest/Tinypool dependencies are targeted at patched versions; run npm install so package-lock.json is regenerated consistently.

## Existing deployment instructions

1. Back up PostgreSQL first.
2. Run `database/migrations/20261029_core_booking_payment_fixes.sql` on an existing database. It may fail if active overlapping bookings already exist; resolve those collisions rather than dropping the constraint.
3. Set backend `APP_ENV=production`, `PAYMENT_MODE=razorpay`, and valid Razorpay key ID/secret in your backend host. Keep `ALLOW_MOCK_PAYMENTS` unset/false.
4. For local mock checkout only, set `APP_ENV=development`, `PAYMENT_MODE=mock`, and `ALLOW_MOCK_PAYMENTS=true` in your ignored backend environment file. It never processes real money.
5. Set `VITE_API_URL` to the backend origin only, without an `/api` suffix, and redeploy the frontend after environment changes. This app sends requests to `/api/...` paths itself.
6. Real Razorpay checkout needs valid test/live keys in the backend and a reachable browser network for Razorpay Checkout. Verify using provider test credentials before production.

## Validation

From the repository root:

```powershell
cd frontend
npm install
npm audit
npm run build
cd ..
$env:PYTHONPATH = "backend"
python -m pytest backend/tests/unit tests/unit
```

The database migration must be tested against a backup/staging database. This patch does not create missing unrelated ML, IoT or notification modules.
