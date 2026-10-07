package com.tic.repository;

import com.tic.dto.request.CreateInspectionRequestRequest;
import com.tic.dto.request.UpdateClientRequestDetailsRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/**
 * Writes and permission checks for the inspection workflow tables:
 * inspection_requests, inspection_assignments, inspections and inspection_reviews.
 * (Read-only listings for the workflow page live in {@link InspectionBoardRepository}.)
 * <p>
 * JSON columns are passed in already serialised (see {@code JsonHelper}).
 */
@Repository
public class InspectionRequestRepository {
    private final JdbcTemplate jdbcTemplate;

    public InspectionRequestRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // ---------------------------------------------------------------- request creation

    /** Organization-specific workflow if one exists, otherwise the tenant default. */
    public Optional<UUID> findActiveWorkflowId(UUID tenantId, UUID organizationId) {
        return jdbcTemplate.queryForList("""
                select id from workflow_definitions
                where tenant_id = ? and (organization_id = ? or organization_id is null) and is_active = true
                order by organization_id nulls last
                limit 1
                """, UUID.class, tenantId, organizationId).stream().findFirst();
    }

    public boolean existsOpenDuplicate(UUID tenantId, UUID requestedBy, UUID siteId, String serviceRequest, LocalDate preferredDate) {
        Integer count = jdbcTemplate.queryForObject("""
                select count(*) from inspection_requests
                where tenant_id = ?
                  and requested_by = ?
                  and farm_id = ?
                  and coalesce(service_request, inspection_type) = ?
                  and preferred_date = ?
                  and status not in ('COMPLETED', 'CANCELLED')
                """, Integer.class, tenantId, requestedBy, siteId, serviceRequest, Date.valueOf(preferredDate));
        return count != null && count > 0;
    }

    public UUID create(UUID tenantId, UUID organizationId, UUID requestedBy, UUID workflowId,
                       CreateInspectionRequestRequest request, String productSpecializationsJson,
                       String optionalRequirementsJson) {
        return jdbcTemplate.queryForObject("""
                insert into inspection_requests(
                    tenant_id, organization_id, farm_id, requested_by, workflow_definition_id,
                    inspection_type, preferred_date, status, current_step, priority, notes,
                    inspection_classification, service_request, product, product_specializations,
                    packaging_type, atmosphere_type, inspection_unit, units_per_pallet,
                    pallet_count, total_units, total_weight_kg, consignee, optional_requirements
                )
                values (?, ?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', 'SUPERVISOR_REVIEW', 'NORMAL', ?, ?,
                        ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb)
                returning id
                """, UUID.class, tenantId, organizationId, request.farmId(), requestedBy, workflowId,
                request.inspectionType(), Date.valueOf(request.preferredDate()), request.notes(), request.classification(),
                request.serviceRequest(), request.product(), productSpecializationsJson,
                request.packagingType(), request.atmosphereType(), request.inspectionUnit(), request.unitsPerPallet(),
                request.palletCount(), request.totalUnits(), request.totalWeightKg(), request.consignee(),
                optionalRequirementsJson);
    }

    // ---------------------------------------------------------------- editing request details

    /**
     * An open request is editable by a supervisor of its organization (or a system admin),
     * or by the inspector it is assigned to.
     */
    public boolean isEditableBy(UUID requestId, UUID tenantId, boolean systemAdmin, UUID organizationId,
                                boolean supervisor, UUID userId) {
        Integer count = jdbcTemplate.queryForObject("""
                select count(*)
                from inspection_requests ir
                left join inspection_assignments ia on ia.inspection_request_id = ir.id
                where ir.id = ? and ir.tenant_id = ? and ir.status not in ('COMPLETED', 'CANCELLED')
                  and (? or ir.organization_id = ?)
                  and (? or ia.inspector_id = ?)
                """, Integer.class, requestId, tenantId, systemAdmin, organizationId, supervisor, userId);
        return count != null && count > 0;
    }

    public void updateSiteOfRequest(UUID requestId, UUID tenantId, UpdateClientRequestDetailsRequest details) {
        jdbcTemplate.update("""
                update farms
                set name = ?, county = ?, sub_county = ?, latitude = ?, longitude = ?, site_type = ?,
                    primary_crop = ?, updated_at = now()
                where id = (select farm_id from inspection_requests where id = ? and tenant_id = ?)
                """, details.siteName(), details.county(), details.subCounty(), details.latitude(), details.longitude(),
                details.inspectionUnit(), details.product(), requestId, tenantId);
    }

    public void updateDetails(UUID requestId, UUID tenantId, UpdateClientRequestDetailsRequest details,
                              String productSpecializationsJson, String optionalRequirementsJson) {
        jdbcTemplate.update("""
                update inspection_requests
                set inspection_type = ?, inspection_classification = ?, preferred_date = ?, notes = ?,
                    service_request = ?, product = ?, product_specializations = ?::jsonb,
                    packaging_type = ?, atmosphere_type = ?, inspection_unit = ?, units_per_pallet = ?,
                    pallet_count = ?, total_units = ?, total_weight_kg = ?, consignee = ?,
                    optional_requirements = ?::jsonb, updated_at = now()
                where id = ? and tenant_id = ?
                """, details.inspectionType(), details.classification(), Date.valueOf(details.inspectionDate()), details.notes(),
                details.serviceRequest(), details.product(), productSpecializationsJson,
                details.packagingType(), details.atmosphereType(), details.inspectionUnit(), details.unitsPerPallet(),
                details.palletCount(), details.totalUnits(), details.totalWeightKg(), details.consignee(),
                optionalRequirementsJson, requestId, tenantId);
    }

    // ---------------------------------------------------------------- supervisor: standard + assignment

    /** @return number of rows updated (0 when the request is not visible to the caller) */
    public int selectStandard(UUID requestId, UUID tenantId, UUID standardId, UUID formTemplateId,
                              boolean systemAdmin, UUID organizationId) {
        return jdbcTemplate.update("""
                update inspection_requests
                set standard_id = ?, form_template_id = ?, status = 'PENDING_ASSIGNMENT',
                    current_step = 'PENDING_ASSIGNMENT', updated_at = now()
                where id = ? and tenant_id = ? and (? or organization_id = ?)
                """, standardId, formTemplateId, requestId, tenantId, systemAdmin, organizationId);
    }

    /** Organization of a request that is still waiting for review/assignment and visible to the caller. */
    public Optional<UUID> findAssignableRequestOrganization(UUID requestId, UUID tenantId, boolean systemAdmin, UUID organizationId) {
        return jdbcTemplate.queryForList("""
                select organization_id
                from inspection_requests
                where id = ? and tenant_id = ? and status in ('PENDING_REVIEW', 'PENDING_ASSIGNMENT')
                  and (? or organization_id = ?)
                """, UUID.class, requestId, tenantId, systemAdmin, organizationId).stream().findFirst();
    }

    public boolean isActiveInspectorOfOrganization(UUID inspectorId, UUID tenantId, UUID organizationId) {
        Integer count = jdbcTemplate.queryForObject("""
                select count(*)
                from users u
                join user_roles ur on ur.user_id = u.id
                join roles r on r.id = ur.role_id
                where u.id = ? and u.tenant_id = ? and u.organization_id = ?
                  and ur.organization_id = ? and u.status = 'ACTIVE' and r.code = 'INSPECTOR'
                """, Integer.class, inspectorId, tenantId, organizationId, organizationId);
        return count != null && count > 0;
    }

    public void replaceAssignment(UUID requestId, UUID inspectorId, UUID assignedBy, LocalDate scheduledDate) {
        jdbcTemplate.update("delete from inspection_assignments where inspection_request_id = ?", requestId);
        jdbcTemplate.update("""
                insert into inspection_assignments(inspection_request_id, inspector_id, assigned_by, scheduled_date, status)
                values (?, ?, ?, ?, 'ASSIGNED')
                """, requestId, inspectorId, assignedBy, Date.valueOf(scheduledDate));
    }

    public void updateStatus(UUID requestId, UUID tenantId, String status, String currentStep) {
        jdbcTemplate.update("""
                update inspection_requests
                set status = ?, current_step = ?, updated_at = now()
                where id = ? and tenant_id = ?
                """, status, currentStep, requestId, tenantId);
    }

    // ---------------------------------------------------------------- inspector: execution

    public boolean isAssignedAndReadyToStart(UUID requestId, UUID tenantId, UUID inspectorId) {
        Integer count = jdbcTemplate.queryForObject("""
                select count(*)
                from inspection_requests ir
                join inspection_assignments ia on ia.inspection_request_id = ir.id
                where ir.id = ? and ir.tenant_id = ? and ir.status = 'ASSIGNED' and ia.inspector_id = ?
                """, Integer.class, requestId, tenantId, inspectorId);
        return count != null && count > 0;
    }

    public UUID createInspection(UUID requestId, UUID tenantId, UUID inspectorId) {
        UUID formTemplateId = jdbcTemplate.queryForObject(
                "select form_template_id from inspection_requests where id = ? and tenant_id = ?",
                (rs, rowNum) -> rs.getObject("form_template_id", UUID.class),
                requestId, tenantId);
        return jdbcTemplate.queryForObject("""
                insert into inspections(tenant_id, inspection_request_id, form_template_id, inspector_id, started_at, client_uuid)
                values (?, ?, ?, ?, now(), uuid_generate_v4())
                returning id
                """, UUID.class, tenantId, requestId, formTemplateId, inspectorId);
    }

    /** Saves notes + capture on the inspector's latest inspection for the request. @return rows updated */
    public int saveLatestInspectionDraft(UUID requestId, UUID tenantId, UUID inspectorId, String notes, String captureJson) {
        return jdbcTemplate.update("""
                update inspections
                set inspector_notes = ?, capture_data = ?::jsonb, updated_at = now()
                where id = (
                    select id from inspections
                    where inspection_request_id = ? and tenant_id = ? and inspector_id = ?
                    order by created_at desc
                    limit 1
                )
                """, notes, captureJson, requestId, tenantId, inspectorId);
    }

    /** Marks the inspector's latest inspection as submitted. @return rows updated */
    public int submitLatestInspection(UUID requestId, UUID tenantId, UUID inspectorId, String notes, String captureJson) {
        // NOTE: score/result are placeholders until scoring is implemented.
        return jdbcTemplate.update("""
                update inspections
                set submitted_at = now(), overall_score_pct = 86.50, result = 'PASS', inspector_notes = ?,
                    capture_data = ?::jsonb, updated_at = now()
                where id = (
                    select id from inspections
                    where inspection_request_id = ? and tenant_id = ? and inspector_id = ?
                    order by created_at desc
                    limit 1
                )
                """, notes, captureJson, requestId, tenantId, inspectorId);
    }

    // ---------------------------------------------------------------- supervisor: review

    public Optional<UUID> findLatestSubmittedInspection(UUID requestId, UUID tenantId, boolean systemAdmin, UUID organizationId) {
        return jdbcTemplate.queryForList("""
                select inspection.id
                from inspections inspection
                join inspection_requests request on request.id = inspection.inspection_request_id
                where request.id = ? and request.tenant_id = ? and request.status = 'SUBMITTED'
                  and (? or request.organization_id = ?)
                order by inspection.created_at desc
                limit 1
                """, UUID.class, requestId, tenantId, systemAdmin, organizationId).stream().findFirst();
    }

    public void replaceInspectorNotes(UUID inspectionId, String notes) {
        jdbcTemplate.update("update inspections set inspector_notes = ?, updated_at = now() where id = ?", notes, inspectionId);
    }

    public void createReview(UUID inspectionId, UUID reviewerId, String decision, String comments) {
        jdbcTemplate.update("""
                insert into inspection_reviews(inspection_id, reviewer_id, decision, comments)
                values (?, ?, ?, ?)
                """, inspectionId, reviewerId, decision, comments);
    }
}
