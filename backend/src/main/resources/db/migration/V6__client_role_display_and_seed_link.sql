UPDATE roles
SET name = 'Client'
WHERE code = 'FARMER' AND name <> 'Client';

UPDATE farmers f
SET user_id = u.id,
    client_name = COALESCE(f.client_name, 'Kamau Farm'),
    designation = 'FARMER_PRODUCER'
FROM users u
WHERE f.tenant_id = u.tenant_id
  AND f.phone = '+254712345678'
  AND u.email = 'farmer@agricert.co.ke'
  AND f.user_id IS NULL;
