package com.tic.repository;

import com.tic.model.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {
    List<Organization> findAllByTenantIdOrderByNameAsc(UUID tenantId);

    Optional<Organization> findByTenantIdAndId(UUID tenantId, UUID id);

    boolean existsByTenantIdAndNameIgnoreCase(UUID tenantId, String name);

    /** Organizations a new client may sign up to: active, licensed and not expired. */
    @Query("""
            select organization from Organization organization
            where organization.tenantId = :tenantId
              and organization.active = true
              and organization.licenseStatus = com.tic.model.enums.OrganizationLicenseStatus.ACTIVE
              and (organization.licenseExpiresAt is null or organization.licenseExpiresAt >= :today)
            order by organization.name asc
            """)
    List<Organization> findAllAvailableForSignup(@Param("tenantId") UUID tenantId, @Param("today") LocalDate today);

    /** Users + clients + inspection requests linked to the organization (blocks permanent deletion). */
    @Query(value = """
            select (select count(*) from users where organization_id = :organizationId)
                 + (select count(*) from farmers where organization_id = :organizationId)
                 + (select count(*) from inspection_requests where organization_id = :organizationId)
            """, nativeQuery = true)
    long countRelatedRecords(@Param("organizationId") UUID organizationId);
}
