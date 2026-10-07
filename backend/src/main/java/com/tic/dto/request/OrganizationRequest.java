package com.tic.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Create or update an organization. {@code type} accepts labels like "Inspection & Certification Body". */
public record OrganizationRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 50) String type,
        @Size(max = 100) String county,
        @Email @Size(max = 255) String contactEmail,
        @Size(max = 30) String contactPhone
) {
}
