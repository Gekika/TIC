package com.tic.service;

import com.tic.config.TicProperties;
import com.tic.dto.request.CompleteAccountSetupRequest;
import com.tic.dto.response.AccountSetupDetailsResponse;
import com.tic.exception.BadRequestException;
import com.tic.exception.ForbiddenException;
import com.tic.exception.NotFoundException;
import com.tic.model.User;
import com.tic.model.enums.AccountTokenPurpose;
import com.tic.model.enums.UserStatus;
import com.tic.repository.AccountSetupTokenRepository;
import com.tic.repository.UserRepository;
import com.tic.repository.UserRoleRepository;
import com.tic.security.CurrentUser;
import com.tic.shared.constants.RoleCodes;
import com.tic.shared.util.TextUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Objects;
import java.util.UUID;

/**
 * Single-use account links: invitations, admin-triggered and self-service password resets.
 * <p>
 * Flow: issue a random token -> store only its SHA-256 hash -> email the raw token as
 * {@code <portal>/account-setup?token=...} -> validate / complete consumes it.
 */
@Service
public class AccountAccessService {
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final AccountSetupTokenRepository tokenRepository;
    private final OrganizationLicenseService organizationLicenseService;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();
    private final String portalBaseUrl;
    private final long tokenHours;

    public AccountAccessService(
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            AccountSetupTokenRepository tokenRepository,
            OrganizationLicenseService organizationLicenseService,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            TicProperties properties
    ) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.tokenRepository = tokenRepository;
        this.organizationLicenseService = organizationLicenseService;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.portalBaseUrl = properties.portal().baseUrl().replaceAll("/+$", "");
        this.tokenHours = properties.accountSetup().tokenHours();
    }

    @Transactional
    public void sendInvitation(User user, CurrentUser actor) {
        issueAndSend(user, actor.id(), AccountTokenPurpose.INVITATION);
    }

    @Transactional
    public void resendInvitation(UUID userId, CurrentUser actor) {
        User user = requireManageableUser(userId, actor);
        if (user.getStatus() != UserStatus.INVITED) {
            throw new BadRequestException("USER_ALREADY_ACTIVE", "Only pending invitations can be resent");
        }
        issueAndSend(user, actor.id(), AccountTokenPurpose.INVITATION);
    }

    @Transactional
    public void sendPasswordReset(UUID userId, CurrentUser actor) {
        User user = requireManageableUser(userId, actor);
        if (!user.isActive()) {
            throw new BadRequestException("USER_NOT_ACTIVE", "Password reset is only available for active users");
        }
        issueAndSend(user, actor.id(), AccountTokenPurpose.PASSWORD_RESET);
    }

    /** Self-service "forgot password". Silently does nothing for unknown/inactive accounts. */
    @Transactional
    public void requestPasswordReset(UUID tenantId, String email) {
        userRepository.findByTenantIdAndEmailIgnoreCase(tenantId, email.trim())
                .filter(User::isActive)
                .filter(this::hasLicenseAccess)
                .ifPresent(user -> issueAndSend(user, null, AccountTokenPurpose.PASSWORD_RESET));
    }

    @Transactional(readOnly = true)
    public AccountSetupDetailsResponse validate(UUID tenantId, String rawToken) {
        var token = requireActiveToken(tenantId, rawToken);
        User user = userRepository.findByTenantIdAndId(tenantId, token.userId()).orElseThrow(this::invalidToken);
        requireLicenseAccess(user);
        boolean invitation = AccountTokenPurpose.INVITATION.name().equals(token.purpose());
        return new AccountSetupDetailsResponse(token.purpose(), user.getEmail(), token.expiresAt(), invitation);
    }

    @Transactional
    public void complete(UUID tenantId, CompleteAccountSetupRequest request) {
        var token = requireActiveToken(tenantId, request.token());
        User user = userRepository.findByTenantIdAndId(tenantId, token.userId()).orElseThrow(this::invalidToken);
        requireLicenseAccess(user);

        if (AccountTokenPurpose.INVITATION.name().equals(token.purpose())) {
            if (TextUtils.isBlank(request.firstName()) || TextUtils.isBlank(request.lastName())) {
                throw new BadRequestException("PROFILE_REQUIRED", "First and last name are required to accept an invitation");
            }
            user.activateInvitation(request.firstName().trim(), request.lastName().trim(), passwordEncoder.encode(request.password()));
        } else {
            user.changePassword(passwordEncoder.encode(request.password()));
        }

        if (!tokenRepository.consume(token.id())) {
            throw invalidToken();
        }
    }

    // ---------------------------------------------------------------- internals

    private void issueAndSend(User user, UUID createdBy, AccountTokenPurpose purpose) {
        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        OffsetDateTime expiresAt = OffsetDateTime.now().plusHours(tokenHours);

        tokenRepository.revokeOpenTokens(user.getId(), purpose.name());
        tokenRepository.create(user.getTenantId(), user.getId(), sha256(rawToken), purpose.name(), expiresAt, createdBy);

        String link = portalBaseUrl + "/account-setup?token=" + rawToken;
        emailService.sendAccountLink(user.getEmail(), purpose, link, expiryLabel());
    }

    private String expiryLabel() {
        return tokenHours % 24 == 0
                ? (tokenHours / 24) + (tokenHours == 24 ? " day" : " days")
                : tokenHours + (tokenHours == 1 ? " hour" : " hours");
    }

    private User requireManageableUser(UUID userId, CurrentUser actor) {
        if (actor == null || !actor.isAdministrator()) {
            throw new ForbiddenException("USER_MANAGEMENT_FORBIDDEN", "Only an administrator can manage account access");
        }
        User user = userRepository.findByTenantIdAndId(actor.tenantId(), userId)
                .orElseThrow(() -> new NotFoundException("USER_NOT_FOUND", "User not found"));
        if (!actor.isSystemAdmin() && !Objects.equals(actor.organizationId(), user.getOrganizationId())) {
            throw new ForbiddenException("ORGANIZATION_MISMATCH", "You can only manage users in your organization");
        }
        return user;
    }

    private AccountSetupTokenRepository.ActiveToken requireActiveToken(UUID tenantId, String rawToken) {
        if (TextUtils.isBlank(rawToken)) {
            throw invalidToken();
        }
        return tokenRepository.findActive(tenantId, sha256(rawToken)).orElseThrow(this::invalidToken);
    }

    private boolean hasLicenseAccess(User user) {
        return userRoleRepository.roleCodesForUser(user.getId()).contains(RoleCodes.SYSTEM_ADMIN)
                || organizationLicenseService.isAccessible(user.getTenantId(), user.getOrganizationId());
    }

    private void requireLicenseAccess(User user) {
        organizationLicenseService.requireAccessible(
                user.getTenantId(), user.getOrganizationId(), userRoleRepository.roleCodesForUser(user.getId()));
    }

    private static String sha256(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private BadRequestException invalidToken() {
        return new BadRequestException("ACCOUNT_SETUP_LINK_INVALID", "This account setup link is invalid, expired, or already used");
    }
}
