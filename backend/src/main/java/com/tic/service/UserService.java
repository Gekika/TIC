package com.tic.service;

import com.tic.dto.request.ChangeUserRoleRequest;
import com.tic.dto.request.ChangeUserStatusRequest;
import com.tic.dto.request.InviteUserRequest;
import com.tic.dto.request.UpdateUserRequest;
import com.tic.dto.response.UserResponse;
import com.tic.exception.BadRequestException;
import com.tic.exception.ConflictException;
import com.tic.exception.ForbiddenException;
import com.tic.exception.NotFoundException;
import com.tic.model.Organization;
import com.tic.model.Role;
import com.tic.model.User;
import com.tic.model.enums.UserStatus;
import com.tic.repository.OrganizationRepository;
import com.tic.repository.RoleRepository;
import com.tic.repository.UserRepository;
import com.tic.repository.UserRoleRepository;
import com.tic.security.CurrentUser;
import com.tic.shared.constants.RoleCodes;
import com.tic.shared.tenancy.TenantContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

/**
 * User administration. Rules:
 * <ul>
 *     <li>SYSTEM_ADMIN manages everyone in the tenant; ORG_ADMIN only their own organization</li>
 *     <li>only SYSTEM_ADMIN may grant/revoke SYSTEM_ADMIN or manage a SYSTEM_ADMIN account</li>
 *     <li>nobody can suspend themselves or revoke their own admin role</li>
 * </ul>
 */
@Service
public class UserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;
    private final AccountAccessService accountAccessService;

    public UserService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository,
            OrganizationRepository organizationRepository,
            PasswordEncoder passwordEncoder,
            AccountAccessService accountAccessService
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.organizationRepository = organizationRepository;
        this.passwordEncoder = passwordEncoder;
        this.accountAccessService = accountAccessService;
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> list(Pageable pageable, CurrentUser actor) {
        UUID tenantId = TenantContext.requireTenantId();
        requireAdministrator(actor, tenantId, "You cannot view users for this tenant");
        Page<User> users = actor.isSystemAdmin()
                ? userRepository.findAllByTenantId(tenantId, pageable)
                : userRepository.findAllByTenantIdAndOrganizationId(tenantId, actor.organizationId(), pageable);
        return users.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public UserResponse get(UUID id) {
        return toResponse(requireTenantUser(id));
    }

    /** Creates an INVITED account with the given role and emails a set-up link. */
    @Transactional
    public UserResponse invite(InviteUserRequest request, CurrentUser actor) {
        UUID tenantId = TenantContext.requireTenantId();
        requireAdministrator(actor, tenantId, "You cannot invite users to this tenant");
        String roleCode = normalizeRole(request.roleCode());
        if (RoleCodes.SYSTEM_ADMIN.equals(roleCode) && !actor.isSystemAdmin()) {
            throw new ForbiddenException("SYSTEM_ROLE_FORBIDDEN", "Only a system administrator can invite another system administrator");
        }
        if (!actor.isSystemAdmin() && !Objects.equals(actor.organizationId(), request.organizationId())) {
            throw new ForbiddenException("ORGANIZATION_MISMATCH", "You can only invite users to your organization");
        }
        Organization organization = organizationRepository.findByTenantIdAndId(tenantId, request.organizationId())
                .orElseThrow(() -> new NotFoundException("ORG_NOT_FOUND", "The selected organization does not exist in this tenant"));
        if (!organization.hasAccessibleLicense(LocalDate.now())) {
            throw new ConflictException("ORGANIZATION_LICENSE_INACTIVE", "Users cannot be invited to an organization with an inactive license");
        }

        String unusablePassword = passwordEncoder.encode(UUID.randomUUID().toString());
        User user = userRepository.saveAndFlush(User.invited(tenantId, request.organizationId(), request.email(), unusablePassword));
        userRoleRepository.addRole(user.getId(), requireRole(tenantId, roleCode).getId(), request.organizationId());
        accountAccessService.sendInvitation(user, actor);
        return get(user.getId());
    }

    @Transactional
    public UserResponse update(UUID id, UpdateUserRequest request) {
        User user = requireTenantUser(id);
        user.updateProfile(request.firstName(), request.lastName(), request.phone());
        return toResponse(user);
    }

    @Transactional
    public UserResponse changeRole(UUID id, ChangeUserRoleRequest request, CurrentUser actor) {
        UUID tenantId = TenantContext.requireTenantId();
        if (actor == null || !actor.belongsToTenant(tenantId)) {
            throw new ForbiddenException("ROLE_CHANGE_FORBIDDEN", "You cannot manage roles for this tenant");
        }
        if (!actor.isAdministrator()) {
            throw new ForbiddenException("ROLE_CHANGE_FORBIDDEN", "Only an administrator can manage user roles");
        }

        User user = requireTenantUser(id);
        String roleCode = normalizeRole(request.roleCode());
        boolean protectedRole = RoleCodes.SYSTEM_ADMIN.equals(roleCode) || RoleCodes.ORG_ADMIN.equals(roleCode);
        if (RoleCodes.SYSTEM_ADMIN.equals(roleCode) && !actor.isSystemAdmin()) {
            throw new ForbiddenException("SYSTEM_ROLE_FORBIDDEN", "Only a system administrator can manage the system administrator role");
        }
        if (request.isRemove() && actor.id().equals(user.getId()) && protectedRole) {
            throw new BadRequestException("SELF_ROLE_REVOKE_FORBIDDEN", "You cannot revoke your own protected administrator role");
        }
        if (!Objects.equals(user.getOrganizationId(), request.organizationId())) {
            throw new BadRequestException("ORGANIZATION_MISMATCH", "Role changes must use the user's organization");
        }
        if (!actor.isSystemAdmin() && !Objects.equals(actor.organizationId(), user.getOrganizationId())) {
            throw new ForbiddenException("ORGANIZATION_MISMATCH", "You can only manage roles in your organization");
        }

        Role role = requireRole(tenantId, roleCode);
        if (request.isAdd()) {
            userRoleRepository.addRole(user.getId(), role.getId(), request.organizationId());
        } else {
            userRoleRepository.removeRole(user.getId(), role.getId(), request.organizationId());
        }
        return get(id);
    }

    @Transactional
    public UserResponse changeStatus(UUID id, ChangeUserStatusRequest request, CurrentUser actor) {
        UUID tenantId = TenantContext.requireTenantId();
        requireAdministrator(actor, tenantId, "You cannot manage users for this tenant");
        User user = requireTenantUser(id);
        UserStatus newStatus = UserStatus.valueOf(request.status());
        if (actor.id().equals(user.getId()) && newStatus != UserStatus.ACTIVE) {
            throw new BadRequestException("SELF_STATUS_CHANGE_FORBIDDEN", "You cannot suspend or deactivate your own account");
        }
        if (!actor.isSystemAdmin() && !Objects.equals(actor.organizationId(), user.getOrganizationId())) {
            throw new ForbiddenException("ORGANIZATION_MISMATCH", "You can only manage users in your organization");
        }
        if (!actor.isSystemAdmin() && userRoleRepository.roleCodesForUser(user.getId()).contains(RoleCodes.SYSTEM_ADMIN)) {
            throw new ForbiddenException("SYSTEM_ROLE_FORBIDDEN", "Only a system administrator can manage a system administrator account");
        }
        user.changeStatus(newStatus);
        return toResponse(user);
    }

    // ---------------------------------------------------------------- helpers

    private UserResponse toResponse(User user) {
        return UserResponse.from(user, userRoleRepository.roleCodesForUser(user.getId()));
    }

    private void requireAdministrator(CurrentUser actor, UUID tenantId, String message) {
        if (actor == null || !actor.belongsToTenant(tenantId) || !actor.isAdministrator()) {
            throw new ForbiddenException("USER_MANAGEMENT_FORBIDDEN", message);
        }
    }

    private Role requireRole(UUID tenantId, String roleCode) {
        return roleRepository.findByTenantIdAndCode(tenantId, roleCode)
                .orElseThrow(() -> new NotFoundException("ROLE_NOT_FOUND", "Role not found"));
    }

    private User requireTenantUser(UUID id) {
        return userRepository.findByTenantIdAndId(TenantContext.requireTenantId(), id)
                .orElseThrow(() -> new NotFoundException("USER_NOT_FOUND", "User not found"));
    }

    private static String normalizeRole(String roleCode) {
        return roleCode.trim().toUpperCase(Locale.ROOT);
    }
}
