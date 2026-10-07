package com.tic.dto.request;

import java.util.UUID;

/** Self-service registration of a client company and its first contact person. */
public record ClientSignupRequest(
        UUID organizationId,
        String clientName,
        String designation,
        String firstName,
        String lastName,
        String nationalId,
        String phone,
        String email,
        String password,
        String county,
        String subCounty
) {
}
