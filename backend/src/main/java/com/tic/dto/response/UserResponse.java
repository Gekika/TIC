package com.tic.dto.response;

import com.tic.model.User;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record UserResponse(
        UUID id,
        UUID tenantId,
        UUID organizationId,
        String name,
        String email,
        String phone,
        String status,
        OffsetDateTime lastLoginAt,
        List<String> roles
) {
    public static UserResponse from(User user, List<String> roles) {
        return new UserResponse(
                user.getId(),
                user.getTenantId(),
                user.getOrganizationId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getStatus().name(),
                user.getLastLoginAt(),
                roles
        );
    }
}
