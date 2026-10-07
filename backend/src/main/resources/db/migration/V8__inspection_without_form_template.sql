-- Inspector capture is now selected by crop and service request in the portal.
-- The legacy dynamic form template remains optional for older inspections.
ALTER TABLE inspections
    ALTER COLUMN form_template_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS capture_data JSONB NOT NULL DEFAULT '{}'::jsonb;
