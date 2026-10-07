package com.tic.service;

import com.tic.dto.request.ClientSignupRequest;
import com.tic.dto.response.LoginResponse;
import com.tic.exception.BadRequestException;
import com.tic.exception.ConflictException;
import com.tic.exception.NotFoundException;
import com.tic.model.Organization;
import com.tic.model.User;
import com.tic.model.enums.ClientDesignation;
import com.tic.repository.ClientRepository;
import com.tic.repository.OrganizationRepository;
import com.tic.repository.RoleRepository;
import com.tic.repository.UserRepository;
import com.tic.repository.UserRoleRepository;
import com.tic.shared.constants.RoleCodes;
import com.tic.shared.tenancy.TenantContext;
import com.tic.shared.util.TextUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * Public self-registration for clients: creates the user, gives it the client role,
 * creates the client profile and signs the new user in.
 */
@Service
public class ClientSignupService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final OrganizationRepository organizationRepository;
    private final ClientRepository clientRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;

    public ClientSignupService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository,
            OrganizationRepository organizationRepository,
            ClientRepository clientRepository,
            PasswordEncoder passwordEncoder,
            AuthService authService
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.organizationRepository = organizationRepository;
        this.clientRepository = clientRepository;
        this.passwordEncoder = passwordEncoder;
        this.authService = authService;
    }

    @Transactional
    public LoginResponse signup(ClientSignupRequest request) {
        validate(request);
        UUID tenantId = TenantContext.requireTenantId();

        if (userRepository.existsByTenantIdAndEmailIgnoreCase(tenantId, request.email())) {
            throw new ConflictException("EMAIL_ALREADY_REGISTERED", "A user with this email already exists");
        }
        Organization organization = requireOrganizationOpenForSignup(tenantId, request.organizationId());

        User user = userRepository.saveAndFlush(new User(
                tenantId,
                organization.getId(),
                request.email(),
                request.phone(),
                passwordEncoder.encode(request.password()),
                request.firstName(),
                request.lastName()
        ));
        var clientRole = roleRepository.findByTenantIdAndCode(tenantId, RoleCodes.CLIENT)
                .orElseThrow(() -> new NotFoundException("ROLE_NOT_FOUND", "The client role is not configured"));
        userRoleRepository.addRole(user.getId(), clientRole.getId(), organization.getId());
        clientRepository.createProfile(tenantId, organization.getId(), user.getId(), request);

        return authService.login(tenantId, request.email(), request.password());
    }

    private void validate(ClientSignupRequest request) {
        boolean missingRequired = Stream.of(
                request.clientName(), request.designation(), request.email(), request.password(),
                request.firstName(), request.lastName(), request.phone(), request.county()
        ).anyMatch(TextUtils::isBlank);
        if (missingRequired) {
            throw new BadRequestException("VALIDATION_ERROR",
                    "Client name, designation, contact name, phone, email, county, and password are required");
        }
        if (!ClientDesignation.isValid(request.designation())) {
            throw new BadRequestException("INVALID_CLIENT_DESIGNATION", "Select a valid client designation");
        }
    }

    private Organization requireOrganizationOpenForSignup(UUID tenantId, UUID organizationId) {
        Optional<Organization> organization = organizationId == null
                ? Optional.empty()
                : organizationRepository.findByTenantIdAndId(tenantId, organizationId);
        return organization
                .filter(candidate -> candidate.hasAccessibleLicense(LocalDate.now()))
                .orElseThrow(() -> new BadRequestException(
                        "ORGANIZATION_NOT_AVAILABLE",
                        "The selected TIC organization is unavailable or its license is inactive"
                ));
    }
}
