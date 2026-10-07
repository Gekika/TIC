-- The original FARMER role/table remains the compatibility key for client accounts.
-- These columns broaden that record to producers, aggregators, processors,
-- exporters, and importers without breaking existing tenant data.
ALTER TABLE farmers
    ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS designation VARCHAR(40) NOT NULL DEFAULT 'FARMER_PRODUCER';

ALTER TABLE farms
    ADD COLUMN IF NOT EXISTS site_type VARCHAR(40) NOT NULL DEFAULT 'ORCHARD';

ALTER TABLE inspection_requests
    ADD COLUMN IF NOT EXISTS service_request VARCHAR(60),
    ADD COLUMN IF NOT EXISTS product VARCHAR(100),
    ADD COLUMN IF NOT EXISTS product_specializations JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS packaging_type VARCHAR(60),
    ADD COLUMN IF NOT EXISTS atmosphere_type VARCHAR(40),
    ADD COLUMN IF NOT EXISTS inspection_unit VARCHAR(40),
    ADD COLUMN IF NOT EXISTS units_per_pallet INTEGER,
    ADD COLUMN IF NOT EXISTS pallet_count INTEGER,
    ADD COLUMN IF NOT EXISTS total_units INTEGER,
    ADD COLUMN IF NOT EXISTS total_weight_kg NUMERIC(14,2),
    ADD COLUMN IF NOT EXISTS consignee VARCHAR(255),
    ADD COLUMN IF NOT EXISTS optional_requirements JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN farmers.client_name IS 'Trading, farm, or legal name used by the general client portal.';
COMMENT ON COLUMN farmers.designation IS 'FARMER_PRODUCER, AGGREGATOR, PROCESSOR, EXPORTER, or IMPORTER.';
COMMENT ON COLUMN farms.name IS 'Client site name: orchard, processing unit, warehouse, cold room, or reefer location.';
COMMENT ON COLUMN inspection_requests.service_request IS 'FIELD_ORCHARD, PSI, QUALITY_ASSURANCE, QUALITY_ASSESSMENT, or DESTINATION_INSPECTION.';
