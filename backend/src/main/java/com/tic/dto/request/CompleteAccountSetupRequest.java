package com.tic.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Completes an invitation (name + password required) or a password reset (password only).
 */
public record CompleteAccountSetupRequest(
        @NotBlank String token,
        @NotBlank @Size(min = 8, max = 128) String password,
        String firstName,
        String lastName
) {
}
