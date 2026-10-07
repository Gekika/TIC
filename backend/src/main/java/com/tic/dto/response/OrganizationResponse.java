package com.tic.dto.response;

import com.tic.model.Organization;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record OrganizationResponse(
        UUID id,
        UUID tenantId,
        String name,
        String type,
        String county,
        String contactEmail,
        String contactPhone,
        String workflowMode,
        boolean active,
        String licenseStatus,
        LocalDate licenseExpiresAt,
        String licenseNotes,
        OffsetDateTime licenseUpdatedAt,
        UUID licenseUpdatedBy,
        boolean licenseAccessible
) {
    public static OrganizationResponse from(Organization organization) {
        return new OrganizationResponse(
                organization.getId(),
                organization.getTenantId(),
                organization.getName(),
                organization.getType(),
                organization.getCounty(),
                organization.getContactEmail(),
                organization.getContactPhone(),
                organization.getWorkflowMode(),
                organization.isActive(),
                organization.getLicenseStatus().name(),
                organization.getLicenseExpiresAt(),
                organization.getLicenseNotes(),
                organization.getLicenseUpdatedAt(),
                organization.getLicenseUpdatedBy(),
                organization.hasAccessibleLicense(LocalDate.now())
        );
    }
}
