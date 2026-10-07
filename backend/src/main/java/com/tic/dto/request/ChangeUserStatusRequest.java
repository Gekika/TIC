package com.tic.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ChangeUserStatusRequest(
        @NotBlank @Pattern(regexp = "ACTIVE|SUSPENDED|DEACTIVATED", message = "Invalid user status") String status
) {
}
