package com.tic.service;

import com.tic.dto.request.OrganizationRequest;
import com.tic.dto.request.UpdateLicenseRequest;
import com.tic.dto.request.WorkflowModeRequest;
import com.tic.dto.response.OrganizationResponse;
import com.tic.dto.response.PublicOrganizationResponse;
import com.tic.exception.BadRequestException;
import com.tic.exception.ConflictException;
import com.tic.exception.ForbiddenException;
import com.tic.exception.NotFoundException;
import com.tic.model.Organization;
import com.tic.model.enums.OrganizationLicenseStatus;
import com.tic.model.enums.OrganizationType;
import com.tic.repository.OrganizationRepository;
import com.tic.security.CurrentUser;
import com.tic.shared.tenancy.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

/**
 * Organizations and their subscription licence.
 * Create / licence / archive / delete are SYSTEM_ADMIN only; ORG_ADMIN can view and edit their own organization.
 */
@Service
public class OrganizationService {
    private final OrganizationRepository organizationRepository;

    public OrganizationService(OrganizationRepository organizationRepository) {
        this.organizationRepository = organizationRepository;
    }

    @Transactional(readOnly = true)
    public List<OrganizationResponse> list(CurrentUser actor) {
        UUID tenantId = TenantContext.requireTenantId();
        requireTenantActor(actor, tenantId);
        List<Organization> organizations = actor.isSystemAdmin()
                ? organizationRepository.findAllByTenantIdOrderByNameAsc(tenantId)
                : organizationRepository.findByTenantIdAndId(tenantId, requireOrganizationId(actor)).stream().toList();
        return organizations.stream().map(OrganizationResponse::from).toList();
    }

    /** Organizations shown on the public client sign-up form. */
    @Transactional(readOnly = true)
    public List<PublicOrganizationResponse> listOpenForSignup() {
        return organizationRepository.findAllAvailableForSignup(TenantContext.requireTenantId(), LocalDate.now())
                .stream()
                .map(PublicOrganizationResponse::from)
                .toList();
    }

    @Transactional
    public OrganizationResponse create(OrganizationRequest request, CurrentUser actor) {
        UUID tenantId = TenantContext.requireTenantId();
        requireSystemAdministrator(actor, tenantId);
        requireUniqueName(tenantId, request.name(), null);
        Organization organization = new Organization(
                tenantId,
                request.name(),
                normalizeType(request.type()),
                request.county(),
                request.contactEmail(),
                request.contactPhone()
        );
        return OrganizationResponse.from(organizationRepository.save(organization));
    }

    @Transactional(readOnly = true)
    public OrganizationResponse get(UUID id, CurrentUser actor) {
        return OrganizationResponse.from(findAccessible(id, actor));
    }

    @Transactional
    public OrganizationResponse update(UUID id, OrganizationRequest request, CurrentUser actor) {
        Organization organization = findAccessible(id, actor);
        requireUniqueName(organization.getTenantId(), request.name(), id);
        organization.update(request.name(), normalizeType(request.type()), request.county(), request.contactEmail(), request.contactPhone());
        return OrganizationResponse.from(organization);
    }

    @Transactional
    public OrganizationResponse updateWorkflowMode(UUID id, WorkflowModeRequest request, CurrentUser actor) {
        Organization organization = findAccessible(id, actor);
        organization.setWorkflowMode(request.mode());
        return OrganizationResponse.from(organization);
    }

    @Transactional
    public OrganizationResponse updateLicense(UUID id, UpdateLicenseRequest request, CurrentUser actor) {
        Organization organization = requireForSystemAdmin(id, actor);
        boolean activating = request.status() == OrganizationLicenseStatus.ACTIVE;
        if (activating && request.expiresAt() != null && request.expiresAt().isBefore(LocalDate.now())) {
            throw new BadRequestException("LICENSE_EXPIRY_INVALID", "An active license cannot have an expiry date in the past");
        }
        if (activating) {
            organization.setActive(true);
        }
        organization.updateLicense(request.status(), request.expiresAt(), request.notes(), actor.id());
        return OrganizationResponse.from(organization);
    }

    /** Blocks access but keeps all history. Idempotent. */
    @Transactional
    public OrganizationResponse archive(UUID id, CurrentUser actor) {
        Organization organization = requireForSystemAdmin(id, actor);
        if (organization.isActive()) {
            organization.setActive(false);
            organization.updateLicense(
                    OrganizationLicenseStatus.SUSPENDED,
                    organization.getLicenseExpiresAt(),
                    "Organization archived by the system administrator",
                    actor.id()
            );
        }
        return OrganizationResponse.from(organization);
    }

    /** Permanent delete: only for archived organizations with no users, clients or inspections. */
    @Transactional
    public void delete(UUID id, CurrentUser actor) {
        Organization organization = requireForSystemAdmin(id, actor);
        if (organization.isActive()) {
            throw new ConflictException("ORGANIZATION_MUST_BE_ARCHIVED", "Archive the organization before deleting it permanently");
        }
        if (organizationRepository.countRelatedRecords(id) > 0) {
            throw new ConflictException(
                    "ORGANIZATION_HAS_HISTORY",
                    "This organization has users, clients, or inspections and cannot be permanently deleted. Keep it archived to preserve its audit history."
            );
        }
        organizationRepository.delete(organization);
        organizationRepository.flush();
    }

    // ---------------------------------------------------------------- helpers

    /** Accepts labels such as "Inspection & Certification Body" and returns the stored code. */
    private static String normalizeType(String type) {
        String normalized = type.trim()
                .toUpperCase(Locale.ROOT)
                .replace("&", "AND")
                .replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
        if (normalized.equals("INSPECTION_AND_CERTIFICATION_BODY")) {
            normalized = OrganizationType.INSPECTION_CERTIFICATION_BODY.name();
        }
        if (!OrganizationType.isValid(normalized)) {
            throw new BadRequestException("ORGANIZATION_TYPE_INVALID", "Select a supported organization type");
        }
        return normalized;
    }

    private Organization findAccessible(UUID id, CurrentUser actor) {
        UUID tenantId = TenantContext.requireTenantId();
        requireTenantActor(actor, tenantId);
        Organization organization = requireOrganization(tenantId, id);
        if (!actor.isSystemAdmin() && !Objects.equals(actor.organizationId(), organization.getId())) {
            throw new ForbiddenException("ORGANIZATION_ACCESS_FORBIDDEN", "You can only access your organization");
        }
        return organization;
    }

    private Organization requireForSystemAdmin(UUID id, CurrentUser actor) {
        UUID tenantId = TenantContext.requireTenantId();
        requireSystemAdministrator(actor, tenantId);
        return requireOrganization(tenantId, id);
    }

    private Organization requireOrganization(UUID tenantId, UUID id) {
        return organizationRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new NotFoundException("ORG_NOT_FOUND", "Organization not found"));
    }

    private void requireUniqueName(UUID tenantId, String name, UUID currentId) {
        if (!organizationRepository.existsByTenantIdAndNameIgnoreCase(tenantId, name.trim())) {
            return;
        }
        boolean renamingItself = currentId != null && organizationRepository.findByTenantIdAndId(tenantId, currentId)
                .map(organization -> organization.getName().equalsIgnoreCase(name.trim()))
                .orElse(false);
        if (!renamingItself) {
            throw new ConflictException("ORGANIZATION_NAME_EXISTS", "An organization with this name already exists");
        }
    }

    private void requireTenantActor(CurrentUser actor, UUID tenantId) {
        if (actor == null || !actor.belongsToTenant(tenantId)) {
            throw new ForbiddenException("ORGANIZATION_ACCESS_FORBIDDEN", "You cannot access organizations for this tenant");
        }
    }

    private void requireSystemAdministrator(CurrentUser actor, UUID tenantId) {
        requireTenantActor(actor, tenantId);
        if (!actor.isSystemAdmin()) {
            throw new ForbiddenException("ORGANIZATION_CREATE_FORBIDDEN", "Only a system administrator can manage organizations");
        }
    }

    private static UUID requireOrganizationId(CurrentUser actor) {
        if (actor.organizationId() == null) {
            throw new ForbiddenException("ORGANIZATION_REQUIRED", "Your account is not assigned to an organization");
        }
        return actor.organizationId();
    }
}
