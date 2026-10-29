-- Apply to an existing PostgreSQL database before enabling the updated app.
-- Back up the database first. The exclusion constraint intentionally fails if
-- existing pending/confirmed bookings overlap for one slot; resolve those rows
-- before re-running this migration.
BEGIN;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check CHECK (
    status IN ('created', 'pending', 'paid', 'failed', 'partially_refunded', 'refunded')
);

ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_status_check;
ALTER TABLE refunds ADD CONSTRAINT refunds_status_check CHECK (
    status IN ('pending', 'processed', 'failed', 'simulated')
);

CREATE EXTENSION IF NOT EXISTS btree_gist;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_active_bookings'
    ) THEN
        ALTER TABLE bookings
        ADD CONSTRAINT no_overlapping_active_bookings
        EXCLUDE USING gist (
            parking_slot_id WITH =,
            tstzrange(start_time, end_time, '[)') WITH &&
        ) WHERE (status IN ('pending', 'confirmed'));
    END IF;
END;
$$;

COMMIT;
