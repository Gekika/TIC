-- Sample accounts, standards, and form templates remain available for testing.
-- Operational jobs must only be created explicitly through the client portal.
DELETE FROM inspection_requests
WHERE notes = 'Seeded avocado origin inspection request';
