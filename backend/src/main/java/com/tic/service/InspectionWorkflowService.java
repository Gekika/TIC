package com.tic.service;

import com.tic.dto.request.AssignInspectorRequest;
import com.tic.dto.request.CreateInspectionRequestRequest;
import com.tic.dto.request.CreateSiteRequest;
import com.tic.dto.request.InspectionCaptureRequest;
import com.tic.dto.request.ReviewInspectionRequest;
import com.tic.dto.request.SelectStandardRequest;
import com.tic.dto.request.UpdateClientRequestDetailsRequest;
import com.tic.exception.BadRequestException;
import com.tic.exception.ConflictException;
import com.tic.exception.ForbiddenException;
import com.tic.exception.NotFoundException;
import com.tic.model.enums.InspectionClassification;
import com.tic.model.enums.InspectionUnit;
import com.tic.model.enums.ServiceRequestType;
import com.tic.repository.ClientRepository;
import com.tic.repository.InspectionRequestRepository;
import com.tic.security.CurrentUser;
import com.tic.shared.tenancy.TenantContext;
import com.tic.shared.util.JsonHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.tic.shared.util.TextUtils.isBlank;

/**
 * Moves an inspection request through its lifecycle:
 * <pre>
 * client creates request      -> PENDING_REVIEW
 * supervisor selects standard -> PENDING_ASSIGNMENT
 * supervisor assigns          -> ASSIGNED
 * inspector starts            -> IN_PROGRESS   (drafts can be saved)
 * inspector submits           -> SUBMITTED
 * supervisor reviews          -> COMPLETED | REJECTED
 * </pre>
 */
@Service
public class InspectionWorkflowService {
    private static final String DEFAULT_SITE_TYPE = "ORCHARD";

    private final InspectionRequestRepository requestRepository;
    private final ClientRepository clientRepository;
    private final JsonHelper json;

    public InspectionWorkflowService(InspectionRequestRepository requestRepository, ClientRepository clientRepository, JsonHelper json) {
        this.requestRepository = requestRepository;
        this.clientRepository = clientRepository;
        this.json = json;
    }

    // ---------------------------------------------------------------- client actions

    @Transactional
    public UUID createSite(CurrentUser user, CreateSiteRequest request) {
        UUID tenantId = TenantContext.requireTenantId();
        requireClient(user);
        UUID clientProfileId = clientRepository.findProfileIdForUser(tenantId, user.id())
                .orElseThrow(() -> new NotFoundException("CLIENT_PROFILE_NOT_FOUND", "Your client profile is not available"));
        String siteType = isBlank(request.siteType()) ? DEFAULT_SITE_TYPE : request.siteType();
        return clientRepository.createSite(tenantId, clientProfileId, request, siteType);
    }

    @Transactional
    public UUID createRequest(CurrentUser user, CreateInspectionRequestRequest request) {
        UUID tenantId = TenantContext.requireTenantId();
        UUID organizationId = requireOrganizationId(user);
        requireClient(user);
        if (!isCompleteServiceRequest(request)) {
            throw new BadRequestException("INVALID_SERVICE_REQUEST", "Complete all required client service request fields");
        }
        if (!clientRepository.isSiteOwnedByUser(tenantId, request.farmId(), user.id())) {
            throw new ForbiddenException("SITE_ACCESS_FORBIDDEN", "The selected site does not belong to your client profile");
        }
        if (!request.preferredDate().isAfter(LocalDate.now())) {
            throw new BadRequestException("INVALID_INSPECTION_DATE", "Inspection date must be after today");
        }
        UUID workflowId = requestRepository.findActiveWorkflowId(tenantId, organizationId)
                .orElseThrow(() -> new ConflictException("WORKFLOW_NOT_CONFIGURED", "No active inspection workflow is configured for your organization"));
        if (requestRepository.existsOpenDuplicate(tenantId, user.id(), request.farmId(), request.serviceRequest(), request.preferredDate())) {
            throw new ConflictException("DUPLICATE_INSPECTION_REQUEST",
                    "This service request has already been submitted for the selected site and inspection date.");
        }
        return requestRepository.create(tenantId, organizationId, user.id(), workflowId, request,
                json.writeList(request.productSpecializations()), json.writeList(request.optionalRequirements()));
    }

    // ---------------------------------------------------------------- supervisor / inspector: correct details

    @Transactional
    public void updateClientRequest(UUID requestId, CurrentUser user, UpdateClientRequestDetailsRequest details) {
        UUID tenantId = TenantContext.requireTenantId();
        if (!isCompleteDetailsUpdate(details)) {
            throw new BadRequestException("INVALID_CLIENT_REQUEST_UPDATE", "Complete all required client request and site fields");
        }
        boolean supervisor = user.isSystemAdmin() || user.isOrganizationOperator();
        if (!supervisor && !user.isInspector()) {
            throw new ForbiddenException("REQUEST_EDIT_FORBIDDEN", "Only a supervisor or assigned inspector can edit this request");
        }
        if (!requestRepository.isEditableBy(requestId, tenantId, user.isSystemAdmin(), user.organizationId(), supervisor, user.id())) {
            throw new ForbiddenException("REQUEST_EDIT_FORBIDDEN", "This request is closed or is not assigned to this inspector");
        }
        requestRepository.updateSiteOfRequest(requestId, tenantId, details);
        requestRepository.updateDetails(requestId, tenantId, details,
                json.writeList(details.productSpecializations()), json.writeList(details.optionalRequirements()));
    }

    // ---------------------------------------------------------------- supervisor actions

    @Transactional
    public void selectStandard(UUID requestId, CurrentUser user, SelectStandardRequest request) {
        requireOperationsAccess(user);
        int updated = requestRepository.selectStandard(requestId, TenantContext.requireTenantId(),
                request.standardId(), request.formTemplateId(), user.isSystemAdmin(), user.organizationId());
        if (updated == 0) {
            throw new ForbiddenException("REQUEST_ACCESS_FORBIDDEN", "This request does not belong to your organization");
        }
    }

    @Transactional
    public void assignInspector(UUID requestId, CurrentUser user, AssignInspectorRequest request) {
        UUID tenantId = TenantContext.requireTenantId();
        requireOperationsAccess(user);
        if (request.inspectorId() == null || request.scheduledDate() == null) {
            throw new BadRequestException("INVALID_ASSIGNMENT", "Select an available inspector and assignment date");
        }
        UUID requestOrganizationId = requestRepository
                .findAssignableRequestOrganization(requestId, tenantId, user.isSystemAdmin(), user.organizationId())
                .orElseThrow(() -> new ForbiddenException("REQUEST_NOT_ASSIGNABLE", "This request is unavailable or belongs to another organization"));
        if (!requestRepository.isActiveInspectorOfOrganization(request.inspectorId(), tenantId, requestOrganizationId)) {
            throw new BadRequestException("INSPECTOR_NOT_AVAILABLE", "The selected inspector is not available");
        }
        requestRepository.replaceAssignment(requestId, request.inspectorId(), user.id(), request.scheduledDate());
        requestRepository.updateStatus(requestId, tenantId, "ASSIGNED", "INSPECTOR_EXECUTION");
    }

    @Transactional
    public void review(UUID requestId, CurrentUser user, ReviewInspectionRequest request) {
        UUID tenantId = TenantContext.requireTenantId();
        requireOperationsAccess(user);
        UUID inspectionId = requestRepository
                .findLatestSubmittedInspection(requestId, tenantId, user.isSystemAdmin(), user.organizationId())
                .orElseThrow(() -> new ForbiddenException("REVIEW_ACCESS_FORBIDDEN", "No submitted inspection from your organization is available for review"));
        if (!isBlank(request.editedReport())) {
            requestRepository.replaceInspectorNotes(inspectionId, request.editedReport());
        }
        requestRepository.createReview(inspectionId, user.id(), request.decision(), request.comments());
        String outcome = request.isApproved() ? "COMPLETED" : "REJECTED";
        requestRepository.updateStatus(requestId, tenantId, outcome, outcome);
    }

    // ---------------------------------------------------------------- inspector actions

    @Transactional
    public UUID startInspection(UUID requestId, CurrentUser user) {
        UUID tenantId = TenantContext.requireTenantId();
        if (!requestRepository.isAssignedAndReadyToStart(requestId, tenantId, user.id())) {
            throw new ForbiddenException("INSPECTION_NOT_ASSIGNED", "Only the assigned inspector can start this inspection");
        }
        UUID inspectionId = requestRepository.createInspection(requestId, tenantId, user.id());
        requestRepository.updateStatus(requestId, tenantId, "IN_PROGRESS", "INSPECTION_IN_PROGRESS");
        return inspectionId;
    }

    @Transactional
    public void saveInspectionDraft(UUID requestId, CurrentUser user, InspectionCaptureRequest capture) {
        int updated = requestRepository.saveLatestInspectionDraft(requestId, TenantContext.requireTenantId(), user.id(),
                capture.moreInfo(), json.writeObject(capture.captureData()));
        if (updated == 0) {
            throw new ConflictException("INSPECTION_DRAFT_NOT_FOUND", "Start the assigned inspection before saving a draft");
        }
    }

    @Transactional
    public void submitInspection(UUID requestId, CurrentUser user, InspectionCaptureRequest capture) {
        UUID tenantId = TenantContext.requireTenantId();
        if (capture == null || isBlank(capture.moreInfo()) || !hasStructuredCapture(capture.captureData())) {
            throw new BadRequestException("INCOMPLETE_INSPECTION",
                    "Complete the inspection measurements, pallet samples, evidence, and inspector notes before submitting");
        }
        int updated = requestRepository.submitLatestInspection(requestId, tenantId, user.id(),
                capture.moreInfo(), json.writeObject(capture.captureData()));
        if (updated == 0) {
            throw new ForbiddenException("INSPECTION_NOT_ASSIGNED", "Only the assigned inspector can submit this inspection");
        }
        requestRepository.updateStatus(requestId, tenantId, "SUBMITTED", "SUPERVISOR_REVIEW_SUBMISSION");
    }

    // ---------------------------------------------------------------- validation & access helpers

    private static boolean isCompleteServiceRequest(CreateInspectionRequestRequest r) {
        return r.farmId() != null && r.preferredDate() != null
                && ServiceRequestType.isValid(r.serviceRequest())
                && !isBlank(r.product()) && !isBlank(r.packagingType()) && !isBlank(r.atmosphereType())
                && InspectionUnit.isValid(r.inspectionUnit()) && !isBlank(r.consignee())
                && isPositive(r.unitsPerPallet()) && isPositive(r.palletCount()) && isPositive(r.totalUnits());
    }

    private static boolean isCompleteDetailsUpdate(UpdateClientRequestDetailsRequest d) {
        return d != null && !isBlank(d.siteName()) && !isBlank(d.county()) && d.inspectionDate() != null
                && InspectionClassification.isValid(d.classification())
                && ServiceRequestType.isValid(d.serviceRequest())
                && !isBlank(d.product()) && !isBlank(d.packagingType()) && !isBlank(d.atmosphereType())
                && InspectionUnit.isValid(d.inspectionUnit()) && !isBlank(d.consignee())
                && isPositive(d.unitsPerPallet()) && isPositive(d.palletCount()) && isPositive(d.totalUnits());
    }

    /** Capture format v1 must include room temperature, crate weight, pallet temperatures and samples. */
    private static boolean hasStructuredCapture(Map<String, Object> captureData) {
        if (captureData == null || !(captureData.get("version") instanceof Number version) || version.intValue() != 1) {
            return false;
        }
        return captureData.get("coldRoomTemperature") instanceof Map<?, ?>
                && captureData.get("emptyCrateWeight") instanceof Map<?, ?>
                && captureData.get("palletTemperatures") instanceof List<?> temperatures && !temperatures.isEmpty()
                && captureData.get("palletSamples") instanceof List<?> samples && !samples.isEmpty();
    }

    private static boolean isPositive(Integer value) {
        return value != null && value > 0;
    }

    private static void requireClient(CurrentUser user) {
        if (!user.isClient()) {
            throw new ForbiddenException("CLIENT_ACCESS_REQUIRED", "Only client accounts can create sites and service requests");
        }
    }

    /** SYSTEM_ADMIN anywhere; SUPERVISOR / ORG_ADMIN inside their organization. */
    private static void requireOperationsAccess(CurrentUser user) {
        if (!user.isSystemAdmin() && !user.isOrganizationOperator()) {
            throw new ForbiddenException("OPERATION_ACCESS_FORBIDDEN", "Only a supervisor or administrator can manage inspection operations");
        }
        if (!user.isSystemAdmin()) {
            requireOrganizationId(user);
        }
    }

    private static UUID requireOrganizationId(CurrentUser user) {
        if (user.organizationId() == null) {
            throw new ForbiddenException("ORGANIZATION_REQUIRED", "Your account is not assigned to an organization");
        }
        return user.organizationId();
    }
}
