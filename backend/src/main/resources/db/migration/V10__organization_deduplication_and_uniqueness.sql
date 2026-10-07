-- Merge organization rows accidentally duplicated by the development seeder.
-- The oldest row is canonical so existing user sessions keep the most stable id.
CREATE TEMP TABLE org_dedup_map ON COMMIT DROP AS
SELECT id AS organization_id,
       first_value(id) OVER (
           PARTITION BY tenant_id, lower(btrim(name))
           ORDER BY created_at, id
       ) AS canonical_id
FROM organizations;

-- A tenant can have one report template per organization. Preserve the most
-- recently edited template before moving the remaining references.
CREATE TEMP TABLE report_template_keep ON COMMIT DROP AS
SELECT DISTINCT ON (mapping.canonical_id)
       template.id AS template_id,
       mapping.canonical_id
FROM report_templates template
JOIN org_dedup_map mapping ON mapping.organization_id = template.organization_id
ORDER BY mapping.canonical_id, template.updated_at DESC, template.created_at DESC, template.id;

DELETE FROM report_templates template
USING org_dedup_map mapping, report_template_keep keeper
WHERE template.organization_id = mapping.organization_id
  AND mapping.canonical_id = keeper.canonical_id
  AND template.id <> keeper.template_id;

UPDATE report_templates template
SET organization_id = keeper.canonical_id,
    updated_at = now()
FROM report_template_keep keeper
WHERE template.id = keeper.template_id
  AND template.organization_id <> keeper.canonical_id;

-- user_roles has a composite primary key, so merge assignments before removing
-- the rows that still point at duplicate organization ids.
INSERT INTO user_roles(user_id, role_id, organization_id)
SELECT assignment.user_id, assignment.role_id, mapping.canonical_id
FROM user_roles assignment
JOIN org_dedup_map mapping ON mapping.organization_id = assignment.organization_id
WHERE mapping.organization_id <> mapping.canonical_id
ON CONFLICT DO NOTHING;

DELETE FROM user_roles assignment
USING org_dedup_map mapping
WHERE assignment.organization_id = mapping.organization_id
  AND mapping.organization_id <> mapping.canonical_id;

UPDATE users entity
SET organization_id = mapping.canonical_id,
    updated_at = now()
FROM org_dedup_map mapping
WHERE entity.organization_id = mapping.organization_id
  AND mapping.organization_id <> mapping.canonical_id;

UPDATE farmers entity
SET organization_id = mapping.canonical_id,
    updated_at = now()
FROM org_dedup_map mapping
WHERE entity.organization_id = mapping.organization_id
  AND mapping.organization_id <> mapping.canonical_id;

UPDATE workflow_definitions entity
SET organization_id = mapping.canonical_id
FROM org_dedup_map mapping
WHERE entity.organization_id = mapping.organization_id
  AND mapping.organization_id <> mapping.canonical_id;

UPDATE inspection_requests entity
SET organization_id = mapping.canonical_id,
    updated_at = now()
FROM org_dedup_map mapping
WHERE entity.organization_id = mapping.organization_id
  AND mapping.organization_id <> mapping.canonical_id;

UPDATE user_role_grants entity
SET organization_id = mapping.canonical_id
FROM org_dedup_map mapping
WHERE entity.organization_id = mapping.organization_id
  AND mapping.organization_id <> mapping.canonical_id;

DELETE FROM organizations organization
USING org_dedup_map mapping
WHERE organization.id = mapping.organization_id
  AND mapping.organization_id <> mapping.canonical_id;

CREATE UNIQUE INDEX uq_organizations_tenant_normalized_name
    ON organizations(tenant_id, lower(btrim(name)));

