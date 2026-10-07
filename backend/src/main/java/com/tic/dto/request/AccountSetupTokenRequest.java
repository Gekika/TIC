package com.tic.dto.request;

import jakarta.validation.constraints.NotBlank;

/** The raw token from an invitation / password-reset link. */
public record AccountSetupTokenRequest(@NotBlank String token) {
}
