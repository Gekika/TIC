package com.tic.repository;

import com.tic.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByTenantIdAndEmailIgnoreCase(UUID tenantId, String email);

    boolean existsByTenantIdAndEmailIgnoreCase(UUID tenantId, String email);

    Optional<User> findByTenantIdAndId(UUID tenantId, UUID id);

    Page<User> findAllByTenantId(UUID tenantId, Pageable pageable);

    Page<User> findAllByTenantIdAndOrganizationId(UUID tenantId, UUID organizationId, Pageable pageable);
}
