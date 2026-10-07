package com.tic.dto.response;

import com.tic.model.Organization;

import java.util.UUID;

/** The minimal organization info shown on the public client sign-up form. */
public record PublicOrganizationResponse(UUID id, String name, String county) {
    public static PublicOrganizationResponse from(Organization organization) {
        return new PublicOrganizationResponse(organization.getId(), organization.getName(), organization.getCounty());
    }
}
