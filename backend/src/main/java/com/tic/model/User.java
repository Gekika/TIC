package com.tic.model;

import com.tic.model.enums.UserStatus;
import com.tic.shared.model.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

/** A person who can sign in. Roles are linked through the user_roles table (see UserRoleRepository). */
@Entity
@Table(name = "users")
public class User extends BaseEntity {
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "organization_id")
    private UUID organizationId;

    @Column(nullable = false)
    private String email;

    private String phone;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status = UserStatus.ACTIVE;

    @Column(nullable = false)
    private String locale = "en-KE";

    @Column(name = "mfa_enabled", nullable = false)
    private boolean mfaEnabled;

    @Column(name = "mfa_secret")
    private String mfaSecret;

    @Column(name = "last_login_at")
    private OffsetDateTime lastLoginAt;

    protected User() {
    }

    public User(UUID tenantId, UUID organizationId, String email, String phone, String passwordHash, String firstName, String lastName) {
        this.tenantId = tenantId;
        this.organizationId = organizationId;
        this.email = email;
        this.phone = phone;
        this.passwordHash = passwordHash;
        this.firstName = firstName;
        this.lastName = lastName;
    }

    /** Creates a placeholder account that becomes ACTIVE when the invitation link is completed. */
    public static User invited(UUID tenantId, UUID organizationId, String email, String unusablePasswordHash) {
        User user = new User(tenantId, organizationId, email, null, unusablePasswordHash, email.split("@", 2)[0], "Invited");
        user.status = UserStatus.INVITED;
        return user;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getFullName() {
        return firstName + " " + lastName;
    }

    public String getPhone() {
        return phone;
    }

    public UserStatus getStatus() {
        return status;
    }

    public boolean isActive() {
        return status == UserStatus.ACTIVE;
    }

    public OffsetDateTime getLastLoginAt() {
        return lastLoginAt;
    }

    public void updateProfile(String firstName, String lastName, String phone) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.phone = phone;
    }

    public void changeStatus(UserStatus status) {
        this.status = status;
    }

    public void activateInvitation(String firstName, String lastName, String passwordHash) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.passwordHash = passwordHash;
        this.status = UserStatus.ACTIVE;
    }

    public void changePassword(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void markLogin() {
        this.lastLoginAt = OffsetDateTime.now();
    }
}
