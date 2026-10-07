package com.tic.repository;

import com.tic.dto.response.FormQuestionResponse;
import com.tic.dto.response.InspectionRequestResponse;
import com.tic.dto.response.LookupItemResponse;
import com.tic.shared.util.JsonHelper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

/**
 * Read-only queries behind the inspection workflow page: request listings and dropdown lookups.
 * Each listing has one method per visibility scope; {@code InspectionBoardService} picks the scope.
 */
@Repository
public class InspectionBoardRepository {
    private static final String CLIENT_NAME = "coalesce(nullif(fa.client_name, ''), fa.first_name || ' ' || fa.last_name)";

    /** "Site name (Client name)" - or just the site name when both are the same. */
    private static final String SITE_LABEL = """
            case
              when lower(trim(f.name)) = lower(trim(%1$s)) then f.name
              else f.name || ' (' || %1$s || ')'
            end""".formatted(CLIENT_NAME);

    private static final String REQUEST_SELECT = """
            select ir.id, ir.organization_id, organization.name as organization_name,
                   ir.created_at, ir.updated_at,
                   ir.status, ir.inspection_type, coalesce(ir.inspection_classification, 'ORIGIN') as classification,
                   ir.preferred_date, ir.notes, ir.form_template_id, f.name as farm_name,
                   f.county as site_county, f.sub_county as site_sub_county,
                   f.latitude as site_latitude, f.longitude as site_longitude, f.site_type,
                   %s as client_name,
                   fa.designation, ir.service_request, ir.product, ir.product_specializations::text,
                   ir.packaging_type, ir.atmosphere_type, ir.inspection_unit,
                   ir.units_per_pallet, ir.pallet_count, ir.total_units, ir.total_weight_kg,
                   ir.consignee, ir.optional_requirements::text,
                   cs.name as standard_name, ft.name as form_name,
                   iu.first_name || ' ' || iu.last_name as inspector_name,
                   (select i.inspector_notes from inspections i
                     where i.inspection_request_id = ir.id
                     order by i.created_at desc limit 1) as inspector_notes,
                   (select i.capture_data::text from inspections i
                     where i.inspection_request_id = ir.id
                     order by i.created_at desc limit 1) as inspection_capture,
                   (select rv.comments from inspections i
                     join inspection_reviews rv on rv.inspection_id = i.id
                     where i.inspection_request_id = ir.id and rv.decision = 'REJECTED'
                     order by rv.reviewed_at desc limit 1) as rejection_reason
            from inspection_requests ir
            join organizations organization on organization.id = ir.organization_id
            join farms f on f.id = ir.farm_id
            join farmers fa on fa.id = f.farmer_id
            left join certification_standards cs on cs.id = ir.standard_id
            left join form_templates ft on ft.id = ir.form_template_id
            left join inspection_assignments ia on ia.inspection_request_id = ir.id
            left join users iu on iu.id = ia.inspector_id
            where ir.tenant_id = ?
            """.formatted(CLIENT_NAME);

    private static final String REQUEST_ORDER = " order by ir.created_at desc limit 100";

    private final JdbcTemplate jdbcTemplate;
    private final RowMapper<InspectionRequestResponse> requestMapper;

    public InspectionBoardRepository(JdbcTemplate jdbcTemplate, JsonHelper jsonHelper) {
        this.jdbcTemplate = jdbcTemplate;
        this.requestMapper = (rs, rowNum) -> mapRequest(rs, jsonHelper);
    }

    // ---------------------------------------------------------------- inspection requests

    public List<InspectionRequestResponse> findRequests(UUID tenantId) {
        return jdbcTemplate.query(REQUEST_SELECT + REQUEST_ORDER, requestMapper, tenantId);
    }

    public List<InspectionRequestResponse> findRequestsOfOrganization(UUID tenantId, UUID organizationId) {
        return jdbcTemplate.query(REQUEST_SELECT + " and ir.organization_id = ?" + REQUEST_ORDER, requestMapper, tenantId, organizationId);
    }

    public List<InspectionRequestResponse> findRequestsAssignedTo(UUID tenantId, UUID inspectorId) {
        return jdbcTemplate.query(REQUEST_SELECT + " and ia.inspector_id = ?" + REQUEST_ORDER, requestMapper, tenantId, inspectorId);
    }

    public List<InspectionRequestResponse> findRequestsMadeBy(UUID tenantId, UUID clientUserId) {
        return jdbcTemplate.query(REQUEST_SELECT + " and ir.requested_by = ?" + REQUEST_ORDER, requestMapper, tenantId, clientUserId);
    }

    // ---------------------------------------------------------------- reference data

    public List<LookupItemResponse> findCommodities(UUID tenantId) {
        return lookup("""
                select id, name || coalesce(' - ' || category, '') as label
                from commodities where tenant_id = ? and is_active = true order by name
                """, tenantId);
    }

    public List<LookupItemResponse> findStandards(UUID tenantId) {
        return lookup("""
                select id, code || ' ' || version || ' - ' || name as label
                from certification_standards where tenant_id = ? and is_active = true order by code
                """, tenantId);
    }

    public List<LookupItemResponse> findPublishedFormTemplates(UUID tenantId) {
        return lookup("""
                select id, name || ' - ' || inspection_type as label
                from form_templates where tenant_id = ? and status = 'PUBLISHED' order by name
                """, tenantId);
    }

    public List<FormQuestionResponse> findFormQuestions(UUID tenantId) {
        return jdbcTemplate.query("""
                select ft.id as form_template_id, fs.title as section_title, fq.question_text,
                       fq.question_type, fq.is_required, fq.is_critical
                from form_templates ft
                join form_sections fs on fs.form_template_id = ft.id
                join form_questions fq on fq.section_id = fs.id
                where ft.tenant_id = ?
                order by ft.name, fs.display_order, fq.display_order
                """, (rs, rowNum) -> new FormQuestionResponse(
                rs.getObject("form_template_id", UUID.class),
                rs.getString("section_title"),
                rs.getString("question_text"),
                rs.getString("question_type"),
                rs.getBoolean("is_required"),
                rs.getBoolean("is_critical")
        ), tenantId);
    }

    // ---------------------------------------------------------------- inspectors

    private static final String INSPECTOR_SELECT = """
            select distinct u.id, u.first_name || ' ' || u.last_name || ' - ' || u.email || ' (Available)' as label
            from users u
            join user_roles ur on ur.user_id = u.id
            join roles r on r.id = ur.role_id
            where u.tenant_id = ? and u.status = 'ACTIVE' and r.code = 'INSPECTOR'
            """;

    public List<LookupItemResponse> findActiveInspectors(UUID tenantId) {
        return lookup(INSPECTOR_SELECT + " order by label", tenantId);
    }

    public List<LookupItemResponse> findActiveInspectorsOfOrganization(UUID tenantId, UUID organizationId) {
        return lookup(INSPECTOR_SELECT + " and u.organization_id = ? and ur.organization_id = ? order by label",
                tenantId, organizationId, organizationId);
    }

    // ---------------------------------------------------------------- clients (farmers table)

    private static final String CLIENT_LABEL = CLIENT_NAME + " || ' - ' || fa.phone";

    public List<LookupItemResponse> findClients(UUID tenantId) {
        return lookup("select fa.id, " + CLIENT_LABEL + " as label from farmers fa"
                + " where fa.tenant_id = ? order by fa.created_at desc limit 20", tenantId);
    }

    public List<LookupItemResponse> findClientsOfOrganization(UUID tenantId, UUID organizationId) {
        return lookup("select fa.id, " + CLIENT_LABEL + " as label from farmers fa"
                + " where fa.tenant_id = ? and fa.organization_id = ? order by fa.created_at desc limit 20", tenantId, organizationId);
    }

    public List<LookupItemResponse> findClientsOfUser(UUID tenantId, UUID clientUserId) {
        return lookup("select fa.id, " + CLIENT_LABEL + " as label from farmers fa"
                + " where fa.tenant_id = ? and fa.user_id = ? order by fa.created_at desc limit 20", tenantId, clientUserId);
    }

    /** Clients that have at least one request assigned to the inspector. */
    public List<LookupItemResponse> findClientsForInspector(UUID tenantId, UUID inspectorId) {
        return lookup("""
                select distinct fa.id, %s as label
                from farmers fa
                join farms f on f.farmer_id = fa.id
                join inspection_requests ir on ir.farm_id = f.id
                join inspection_assignments ia on ia.inspection_request_id = ir.id
                where fa.tenant_id = ? and f.tenant_id = fa.tenant_id and ir.tenant_id = fa.tenant_id
                  and ia.inspector_id = ?
                order by label
                limit 20
                """.formatted(CLIENT_LABEL), tenantId, inspectorId);
    }

    // ---------------------------------------------------------------- sites (farms table)

    private static final String SITE_SELECT = "select f.id, " + SITE_LABEL + " as label"
            + " from farms f join farmers fa on fa.id = f.farmer_id"
            + " where f.tenant_id = ? and fa.tenant_id = f.tenant_id";

    public List<LookupItemResponse> findSites(UUID tenantId) {
        return lookup(SITE_SELECT + " order by f.created_at desc limit 20", tenantId);
    }

    public List<LookupItemResponse> findSitesOfOrganization(UUID tenantId, UUID organizationId) {
        return lookup(SITE_SELECT + " and fa.organization_id = ? order by f.created_at desc limit 20", tenantId, organizationId);
    }

    public List<LookupItemResponse> findSitesOfUser(UUID tenantId, UUID clientUserId) {
        return lookup(SITE_SELECT + " and fa.user_id = ? order by f.created_at desc limit 20", tenantId, clientUserId);
    }

    /** Sites that have at least one request assigned to the inspector. */
    public List<LookupItemResponse> findSitesForInspector(UUID tenantId, UUID inspectorId) {
        return lookup("""
                select distinct f.id, %s as label
                from farms f
                join farmers fa on fa.id = f.farmer_id
                join inspection_requests ir on ir.farm_id = f.id
                join inspection_assignments ia on ia.inspection_request_id = ir.id
                where f.tenant_id = ? and fa.tenant_id = f.tenant_id and ir.tenant_id = f.tenant_id
                  and ia.inspector_id = ?
                order by label
                limit 20
                """.formatted(SITE_LABEL), tenantId, inspectorId);
    }

    // ---------------------------------------------------------------- helpers

    private List<LookupItemResponse> lookup(String sql, Object... params) {
        return jdbcTemplate.query(sql, (rs, rowNum) -> new LookupItemResponse(rs.getObject("id", UUID.class), rs.getString("label")), params);
    }

    private static InspectionRequestResponse mapRequest(ResultSet rs, JsonHelper json) throws SQLException {
        return new InspectionRequestResponse(
                rs.getObject("id", UUID.class),
                rs.getObject("organization_id", UUID.class),
                rs.getString("organization_name"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant(),
                rs.getString("status"),
                rs.getString("inspection_type"),
                rs.getString("classification"),
                rs.getDate("preferred_date") == null ? null : rs.getDate("preferred_date").toLocalDate(),
                rs.getString("notes"),
                rs.getObject("form_template_id", UUID.class),
                rs.getString("farm_name"),
                rs.getString("site_county"),
                rs.getString("site_sub_county"),
                rs.getBigDecimal("site_latitude"),
                rs.getBigDecimal("site_longitude"),
                rs.getString("site_type"),
                rs.getString("client_name"),
                rs.getString("designation"),
                rs.getString("service_request"),
                rs.getString("product"),
                json.readList(rs.getString("product_specializations")),
                rs.getString("packaging_type"),
                rs.getString("atmosphere_type"),
                rs.getString("inspection_unit"),
                (Integer) rs.getObject("units_per_pallet"),
                (Integer) rs.getObject("pallet_count"),
                (Integer) rs.getObject("total_units"),
                rs.getBigDecimal("total_weight_kg"),
                rs.getString("consignee"),
                json.readList(rs.getString("optional_requirements")),
                rs.getString("standard_name"),
                rs.getString("form_name"),
                rs.getString("inspector_name"),
                rs.getString("inspector_notes"),
                json.readObject(rs.getString("inspection_capture")),
                rs.getString("rejection_reason")
        );
    }
}
