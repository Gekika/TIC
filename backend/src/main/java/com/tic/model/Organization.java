package com.tic.model;

import com.tic.model.enums.OrganizationLicenseStatus;
import com.tic.shared.model.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/** A certification/inspection body or client company that owns users, clients and inspections. */
@Entity
@Table(name = "organizations")
public class Organization extends BaseEntity {
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type;

    @Column(name = "registration_no")
    private String registrationNo;

    @Column(nullable = false)
    private String country = "KE";

    private String county;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "contact_phone")
    private String contactPhone;

    @Column(name = "workflow_mode", nullable = false)
    private String workflowMode = "FARMER_SUPERVISOR_INSPECTOR";

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "license_status", nullable = false)
    private OrganizationLicenseStatus licenseStatus = OrganizationLicenseStatus.ACTIVE;

    @Column(name = "license_expires_at")
    private LocalDate licenseExpiresAt;

    @Column(name = "license_notes")
    private String licenseNotes;

    @Column(name = "license_updated_at")
    private OffsetDateTime licenseUpdatedAt;

    @Column(name = "license_updated_by")
    private UUID licenseUpdatedBy;

    protected Organization() {
    }

    public Organization(UUID tenantId, String name, String type, String county, String contactEmail, String contactPhone) {
        this.tenantId = tenantId;
        this.name = name.trim();
        this.type = type;
        this.county = county;
        this.contactEmail = contactEmail;
        this.contactPhone = contactPhone;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public String getName() {
        return name;
    }

    public String getType() {
        return type;
    }

    public String getCounty() {
        return county;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public String getWorkflowMode() {
        return workflowMode;
    }

    public boolean isActive() {
        return active;
    }

    public OrganizationLicenseStatus getLicenseStatus() {
        return licenseStatus;
    }

    public LocalDate getLicenseExpiresAt() {
        return licenseExpiresAt;
    }

    public String getLicenseNotes() {
        return licenseNotes;
    }

    public OffsetDateTime getLicenseUpdatedAt() {
        return licenseUpdatedAt;
    }

    public UUID getLicenseUpdatedBy() {
        return licenseUpdatedBy;
    }

    public boolean hasAccessibleLicense(LocalDate today) {
        return active
                && licenseStatus == OrganizationLicenseStatus.ACTIVE
                && (licenseExpiresAt == null || !licenseExpiresAt.isBefore(today));
    }

    public void update(String name, String type, String county, String contactEmail, String contactPhone) {
        this.name = name.trim();
        this.type = type;
        this.county = county;
        this.contactEmail = contactEmail;
        this.contactPhone = contactPhone;
    }

    public void setWorkflowMode(String workflowMode) {
        this.workflowMode = workflowMode;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public void updateLicense(
            OrganizationLicenseStatus status,
            LocalDate expiresAt,
            String notes,
            UUID updatedBy
    ) {
        this.licenseStatus = status;
        this.licenseExpiresAt = expiresAt;
        this.licenseNotes = notes == null || notes.isBlank() ? null : notes.trim();
        this.licenseUpdatedAt = OffsetDateTime.now();
        this.licenseUpdatedBy = updatedBy;
    }
}
