package com.tic.dto.request;

import com.tic.model.enums.OrganizationLicenseStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateLicenseRequest(
        @NotNull OrganizationLicenseStatus status,
        LocalDate expiresAt,
        @Size(max = 1000) String notes
) {
}
