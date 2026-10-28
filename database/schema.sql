-- SpotSync Database Schema
-- Owner: Vanshika
-- PostgreSQL

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) UNIQUE,

    password_hash TEXT NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin')),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- VEHICLES
-- ============================================================

CREATE TABLE vehicles (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    vehicle_number VARCHAR(30) NOT NULL UNIQUE,
    vehicle_type VARCHAR(30) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- PARKING LOTS
-- ============================================================

CREATE TABLE parking_lots (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,

    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),

    total_slots INTEGER NOT NULL DEFAULT 0
        CHECK (total_slots >= 0),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- PARKING SLOTS
-- ============================================================

CREATE TABLE parking_slots (
    id BIGSERIAL PRIMARY KEY,

    parking_lot_id BIGINT NOT NULL
        REFERENCES parking_lots(id)
        ON DELETE CASCADE,

    slot_number VARCHAR(30) NOT NULL,

    slot_type VARCHAR(30) NOT NULL DEFAULT 'regular',

    is_available BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_slot_per_lot
        UNIQUE (parking_lot_id, slot_number)
);


-- ============================================================
-- BOOKINGS
-- ============================================================

CREATE TABLE bookings (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    vehicle_id BIGINT NOT NULL
        REFERENCES vehicles(id)
        ON DELETE RESTRICT,

    parking_slot_id BIGINT NOT NULL
        REFERENCES parking_slots(id)
        ON DELETE RESTRICT,

    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'confirmed',
                'cancelled',
                'completed'
            )
        ),

    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0
        CHECK (total_amount >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_booking_time
        CHECK (end_time > start_time)
);


-- Prevent concurrent overlapping active reservations for one slot.
-- Also supplied in functions.sql and the existing-database migration.
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

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,

    booking_id BIGINT NOT NULL
        REFERENCES bookings(id)
        ON DELETE RESTRICT,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    amount NUMERIC(10, 2) NOT NULL
        CHECK (amount >= 0),

    currency VARCHAR(10) NOT NULL DEFAULT 'INR',

    status VARCHAR(20) NOT NULL DEFAULT 'created'
        CHECK (
            status IN (
                'created',
                'pending',
                'paid',
                'failed',
                'partially_refunded',
                'refunded'
            )
        ),

    razorpay_order_id VARCHAR(100) UNIQUE,
    razorpay_payment_id VARCHAR(100) UNIQUE,
    razorpay_signature TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- REFUNDS
-- ============================================================

CREATE TABLE refunds (
    id BIGSERIAL PRIMARY KEY,

    payment_id BIGINT NOT NULL
        REFERENCES payments(id)
        ON DELETE RESTRICT,

    amount NUMERIC(10, 2) NOT NULL
        CHECK (amount > 0),

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'processed',
                'failed',
                'simulated'
            )
        ),

    razorpay_refund_id VARCHAR(100) UNIQUE,

    reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);