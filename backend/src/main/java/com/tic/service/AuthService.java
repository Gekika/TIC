package com.tic.service;

import com.tic.dto.response.LoginResponse;
import com.tic.dto.response.UserResponse;
import com.tic.exception.ForbiddenException;
import com.tic.exception.UnauthorizedException;
import com.tic.model.User;
import com.tic.repository.UserRepository;
import com.tic.repository.UserRoleRepository;
import com.tic.security.CurrentUser;
import com.tic.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Email + password sign-in that returns a JWT access token. */
@Service
public class AuthService {
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final OrganizationLicenseService organizationLicenseService;

    public AuthService(
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            OrganizationLicenseService organizationLicenseService
    ) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.organizationLicenseService = organizationLicenseService;
    }

    @Transactional
    public LoginResponse login(UUID tenantId, String email, String password) {
        User user = userRepository.findByTenantIdAndEmailIgnoreCase(tenantId, email)
                .filter(candidate -> passwordEncoder.matches(password, candidate.getPasswordHash()))
                .orElseThrow(() -> new UnauthorizedException("INVALID_CREDENTIALS", "Invalid email or password"));
        if (!user.isActive()) {
            throw new ForbiddenException("USER_INACTIVE", "User account is not active");
        }
        List<String> roles = userRoleRepository.roleCodesForUser(user.getId());
        organizationLicenseService.requireAccessible(tenantId, user.getOrganizationId(), roles);

        user.markLogin();
        userRepository.saveAndFlush(user);

        CurrentUser currentUser = new CurrentUser(
                user.getId(),
                user.getTenantId(),
                user.getOrganizationId(),
                user.getEmail(),
                roles,
                userRoleRepository.permissionCodesForUser(user.getId())
        );
        return new LoginResponse(jwtService.createAccessToken(currentUser), UserResponse.from(user, roles));
    }
}
