package com.tic.seed;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Data the application cannot run without: the default tenant (slug {@code agricert-kenya},
 * which the frontend sends), its first organization, roles + permissions, the default workflow,
 * and a sample commodity / standard / form / report profile.
 */
@Component
public class ReferenceDataSeeder {
    private final JdbcTemplate jdbcTemplate;

    public ReferenceDataSeeder(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public SeedContext seed() {
        UUID tenantId = upsertTenant();
        UUID orgId = upsertOrganization(tenantId);
        seedPermissions();
        seedRolesAndPermissions(tenantId);
        seedWorkflow(tenantId, orgId);
        seedCertificationSample(tenantId);
        return new SeedContext(tenantId, orgId);
    }

    private UUID upsertTenant() {
        return jdbcTemplate.queryForObject("""
                insert into tenants(name, slug, status, plan, settings)
                values ('AgriCert Kenya', 'agricert-kenya', 'ACTIVE', 'STANDARD', '{}'::jsonb)
                on conflict (slug) do update set name = excluded.name
                returning id
                """, UUID.class);
    }

    private UUID upsertOrganization(UUID tenantId) {
        List<UUID> existing = jdbcTemplate.queryForList("""
                select id
                from organizations
                where tenant_id = ? and lower(trim(name)) = lower('AgriCert Kenya Ltd')
                order by created_at asc
                limit 1
                """, UUID.class, tenantId);
        if (!existing.isEmpty()) {
            UUID organizationId = existing.getFirst();
            jdbcTemplate.update("""
                    update organizations
                    set type = 'CERTIFICATION_BODY',
                        county = 'Nairobi',
                        contact_email = 'support@agricert.co.ke',
                        contact_phone = '+254700000000',
                        workflow_mode = 'FARMER_SUPERVISOR_INSPECTOR',
                        updated_at = now()
                    where id = ?
                    """, organizationId);
            return organizationId;
        }
        return jdbcTemplate.queryForObject("""
                insert into organizations(tenant_id, name, type, county, contact_email, contact_phone, workflow_mode)
                values (?, 'AgriCert Kenya Ltd', 'CERTIFICATION_BODY', 'Nairobi', 'support@agricert.co.ke', '+254700000000', 'FARMER_SUPERVISOR_INSPECTOR')
                returning id
                """, UUID.class, tenantId);
    }

    private void seedPermissions() {
        List<String[]> permissions = List.of(
                new String[]{"INSPECTION_CREATE", "inspection"},
                new String[]{"FORM_PUBLISH", "certification"},
                new String[]{"USER_INVITE", "identity"},
                new String[]{"REPORT_VIEW", "reporting"},
                new String[]{"NC_RAISE", "quality"},
                new String[]{"FARMER_REGISTER", "farmregistry"}
        );
        permissions.forEach(permission -> jdbcTemplate.update("""
                insert into permissions(code, module)
                values (?, ?)
                on conflict (code) do nothing
                """, permission[0], permission[1]));
    }

    private void seedRolesAndPermissions(UUID tenantId) {
        List<String[]> roles = List.of(
                new String[]{"SYSTEM_ADMIN", "System Admin"},
                new String[]{"ORG_ADMIN", "Organization Admin"},
                new String[]{"SUPERVISOR", "Supervisor"},
                new String[]{"INSPECTOR", "Inspector"},
                new String[]{"FARMER", "Client"}
        );
        roles.forEach(role -> jdbcTemplate.update("""
                insert into roles(tenant_id, code, name, is_system)
                values (?, ?, ?, true)
                on conflict (tenant_id, code) do nothing
                """, tenantId, role[0], role[1]));

        grantAll(tenantId, "SYSTEM_ADMIN");
        grantAll(tenantId, "ORG_ADMIN");
        grant(tenantId, "SUPERVISOR", "REPORT_VIEW");
        grant(tenantId, "SUPERVISOR", "USER_INVITE");
        grant(tenantId, "INSPECTOR", "INSPECTION_CREATE");
        grant(tenantId, "INSPECTOR", "NC_RAISE");
        grant(tenantId, "INSPECTOR", "FARMER_REGISTER");
        grant(tenantId, "FARMER", "INSPECTION_CREATE");
        grant(tenantId, "FARMER", "REPORT_VIEW");
    }

    private void grantAll(UUID tenantId, String roleCode) {
        jdbcTemplate.update("""
                insert into role_permissions(role_id, permission_id)
                select r.id, p.id
                from roles r cross join permissions p
                where r.tenant_id = ? and r.code = ?
                on conflict do nothing
                """, tenantId, roleCode);
    }

    private void grant(UUID tenantId, String roleCode, String permissionCode) {
        jdbcTemplate.update("""
                insert into role_permissions(role_id, permission_id)
                select r.id, p.id
                from roles r join permissions p on p.code = ?
                where r.tenant_id = ? and r.code = ?
                on conflict do nothing
                """, permissionCode, tenantId, roleCode);
    }

    /** Only one default workflow per organization (the table has no unique key, so check first). */
    private void seedWorkflow(UUID tenantId, UUID orgId) {
        Integer existing = jdbcTemplate.queryForObject(
                "select count(*) from workflow_definitions where tenant_id = ? and organization_id = ?",
                Integer.class, tenantId, orgId);
        if (existing != null && existing > 0) {
            return;
        }
        jdbcTemplate.update("""
                insert into workflow_definitions(tenant_id, organization_id, name, mode, steps)
                values (?, ?, 'Scenario A', 'FARMER_SUPERVISOR_INSPECTOR',
                '[{"step":"PENDING_REVIEW","role":"SUPERVISOR","action":"review_request"},{"step":"ASSIGNED","role":"INSPECTOR","action":"execute_inspection"},{"step":"UNDER_SUPERVISOR_REVIEW","role":"SUPERVISOR","action":"review_submission"},{"step":"COMPLETED","role":"FARMER","action":"download_report"}]'::jsonb)
                """, tenantId, orgId);
    }

    private void seedCertificationSample(UUID tenantId) {
        UUID commodityId = jdbcTemplate.queryForObject("""
                insert into commodities(tenant_id, code, name, category, default_unit)
                values (?, 'AVOCADO', 'Avocado', 'Fresh Fruit', 'boxes')
                on conflict (tenant_id, code) do update set name = excluded.name
                returning id
                """, UUID.class, tenantId);

        UUID standardId = jdbcTemplate.queryForObject("""
                insert into certification_standards(tenant_id, code, name, version, passing_score_pct, commodity_id, inspection_classification)
                values (?, 'GLOBALG.A.P', 'GlobalG.A.P', '5.4', 80, ?, 'ORIGIN')
                on conflict (tenant_id, code, version) do update set name = excluded.name
                returning id
                """, UUID.class, tenantId, commodityId);

        UUID formId = findOrCreateFormTemplate(tenantId, standardId, commodityId);
        seedSampleQuestions(formId);

        jdbcTemplate.update("""
                insert into report_profiles(tenant_id, commodity_id, classification, profile_key, title_pattern, sections, score_labels)
                values (?, ?, 'ORIGIN', 'fresh-fruit-analysis-on-spot',
                'Fresh Fruit Analysis on Spot {containerNumber}',
                '[
                  {"key":"HEADER","title":"Customer, shipper, warehouse, container and inspection date"},
                  {"key":"COMMODITY_DETAILS","title":"Commodity, fruit type, label, atmosphere type and country origin"},
                  {"key":"FINAL_SCORE","title":"Excellent, Good, Fair, Poor and Bad distribution"},
                  {"key":"NOTES","title":"Quality, condition, temperature, temperature recorder and more info"},
                  {"key":"PICTURES","title":"Photo appendix with captions"}
                ]'::jsonb,
                '["Excellent","Good","Fair","Poor","Bad"]'::jsonb)
                on conflict (tenant_id, commodity_id, classification, profile_key) do nothing
                """, tenantId, commodityId);
    }

    private UUID findOrCreateFormTemplate(UUID tenantId, UUID standardId, UUID commodityId) {
        List<UUID> existing = jdbcTemplate.queryForList("""
                select id from form_templates
                where tenant_id = ? and name = 'GlobalG.A.P Pre-Harvest Audit'
                order by created_at desc
                limit 1
                """, UUID.class, tenantId);
        if (!existing.isEmpty()) {
            return existing.getFirst();
        }
        return jdbcTemplate.queryForObject("""
                insert into form_templates(tenant_id, standard_id, name, description, status, inspection_type, commodity_id, inspection_classification)
                values (?, ?, 'GlobalG.A.P Pre-Harvest Audit', 'Sample Sprint 0 seed template', 'PUBLISHED', 'Origin', ?, 'ORIGIN')
                returning id
                """, UUID.class, tenantId, standardId, commodityId);
    }

    private void seedSampleQuestions(UUID formId) {
        Integer existing = jdbcTemplate.queryForObject("select count(*) from form_sections where form_template_id = ?", Integer.class, formId);
        if (existing != null && existing > 0) {
            return;
        }
        UUID siteSection = jdbcTemplate.queryForObject("""
                insert into form_sections(form_template_id, title, description, display_order, weight_pct)
                values (?, 'Site & Soil Management', 'Farm site documentation and soil controls', 1, 20)
                returning id
                """, UUID.class, formId);
        UUID waterSection = jdbcTemplate.queryForObject("""
                insert into form_sections(form_template_id, title, description, display_order, weight_pct)
                values (?, 'Water Management', 'Water safety and contamination controls', 2, 30)
                returning id
                """, UUID.class, formId);
        UUID cropSection = jdbcTemplate.queryForObject("""
                insert into form_sections(form_template_id, title, description, display_order, weight_pct)
                values (?, 'Crop Protection', 'Pesticide and storage controls', 3, 30)
                returning id
                """, UUID.class, formId);
        UUID welfareSection = jdbcTemplate.queryForObject("""
                insert into form_sections(form_template_id, title, description, display_order, weight_pct)
                values (?, 'Worker Welfare', 'Worker safety and first aid controls', 4, 20)
                returning id
                """, UUID.class, formId);

        addQuestion(siteSection, "Is the farm site documented?", "BOOLEAN", false, false, 1);
        addQuestion(siteSection, "Soil test conducted in last 12 months?", "BOOLEAN", false, false, 2);
        addQuestion(waterSection, "Is the water source protected from contamination?", "BOOLEAN", true, true, 1);
        addQuestion(waterSection, "Photo of water source", "PHOTO", true, false, 2);
        addQuestion(waterSection, "Water pH reading", "NUMBER", true, false, 3);
        addQuestion(cropSection, "Do you use pesticides?", "BOOLEAN", false, false, 1);
        addQuestion(cropSection, "Are pesticides stored safely?", "BOOLEAN", true, true, 2);
        addQuestion(welfareSection, "Workers have PPE?", "BOOLEAN", false, false, 1);
        addQuestion(welfareSection, "First aid kit on site?", "BOOLEAN", false, false, 2);
    }

    private void addQuestion(UUID sectionId, String text, String type, boolean required, boolean critical, int order) {
        jdbcTemplate.update("""
                insert into form_questions(section_id, question_text, question_type, is_required, is_critical, display_order)
                values (?, ?, ?, ?, ?, ?)
                """, sectionId, text, type, required, critical, order);
    }
}
