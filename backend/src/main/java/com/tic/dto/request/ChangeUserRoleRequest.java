package com.tic.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

/** Grants (ADD) or revokes (REMOVE) one role for a user in their organization. */
public record ChangeUserRoleRequest(
        @NotBlank String roleCode,
        @NotNull UUID organizationId,
        @NotBlank @Pattern(regexp = "ADD|REMOVE", message = "Action must be ADD or REMOVE") String action
) {
    public boolean isAdd() {
        return "ADD".equals(action);
    }

    public boolean isRemove() {
        return "REMOVE".equals(action);
    }
}
