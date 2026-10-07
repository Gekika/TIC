package com.tic.repository;

import com.tic.dto.request.ClientSignupRequest;
import com.tic.dto.request.CreateSiteRequest;
import com.tic.dto.response.ClientProfileResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Client companies and their sites.
 * <p>
 * The tables keep their original names: a client profile lives in {@code farmers}
 * and a client site lives in {@code farms}.
 */
@Repository
public class ClientRepository {
    private final JdbcTemplate jdbcTemplate;

    public ClientRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void createProfile(UUID tenantId, UUID organizationId, UUID userId, ClientSignupRequest signup) {
        jdbcTemplate.update("""
                insert into farmers(tenant_id, organization_id, user_id, first_name, last_name, national_id,
                                    phone, email, county, sub_county, client_name, designation)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, tenantId, organizationId, userId, signup.firstName(), signup.lastName(), signup.nationalId(),
                signup.phone(), signup.email(), signup.county(), signup.subCounty(),
                signup.clientName(), signup.designation());
    }

    /** The client profile linked to a signed-in client user (most recent if several). */
    public Optional<UUID> findProfileIdForUser(UUID tenantId, UUID userId) {
        return jdbcTemplate.queryForList("""
                select id from farmers
                where tenant_id = ? and user_id = ?
                order by created_at desc
                limit 1
                """, UUID.class, tenantId, userId).stream().findFirst();
    }

    public Optional<ClientProfileResponse> findProfileForUser(UUID tenantId, UUID userId) {
        return jdbcTemplate.query("""
                select coalesce(nullif(client_name, ''), first_name || ' ' || last_name) as client_name, designation
                from farmers
                where tenant_id = ? and user_id = ?
                order by created_at desc
                limit 1
                """, (rs, rowNum) -> new ClientProfileResponse(rs.getString("client_name"), rs.getString("designation")),
                tenantId, userId).stream().findFirst();
    }

    public UUID createSite(UUID tenantId, UUID clientProfileId, CreateSiteRequest site, String siteType) {
        return jdbcTemplate.queryForObject("""
                insert into farms(tenant_id, farmer_id, name, county, sub_county, ward, size_acres,
                                  primary_crop, latitude, longitude, site_type)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                returning id
                """, UUID.class, tenantId, clientProfileId, site.name(), site.county(), site.subCounty(),
                site.ward(), site.sizeAcres(), site.primaryCrop(), site.latitude(), site.longitude(), siteType);
    }

    public boolean isSiteOwnedByUser(UUID tenantId, UUID siteId, UUID userId) {
        Integer count = jdbcTemplate.queryForObject("""
                select count(*)
                from farms f
                join farmers fa on fa.id = f.farmer_id
                where f.id = ? and f.tenant_id = ? and fa.tenant_id = ? and fa.user_id = ?
                """, Integer.class, siteId, tenantId, tenantId, userId);
        return count != null && count > 0;
    }
}
