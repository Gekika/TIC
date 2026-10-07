package com.tic.seed;

import com.tic.shared.constants.RoleCodes;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Demo accounts for local development and demos - enable with {@code TIC_SEED_DEMO_USERS=true}.
 * All use the password {@value #DEMO_PASSWORD}. Never enable on a real production system.
 */
@Component
public class DemoDataSeeder {
    public static final String DEMO_PASSWORD = "Dev@12345";

    private final JdbcTemplate jdbcTemplate;
    private final UserSeeder userSeeder;

    public DemoDataSeeder(JdbcTemplate jdbcTemplate, UserSeeder userSeeder) {
        this.jdbcTemplate = jdbcTemplate;
        this.userSeeder = userSeeder;
    }

    public void seed(SeedContext context) {
        userSeeder.createIfMissing(context, "supervisor@agricert.co.ke", "Supervisor", "User", DEMO_PASSWORD, RoleCodes.SUPERVISOR);
        userSeeder.createIfMissing(context, "inspector@agricert.co.ke", "Inspector", "User", DEMO_PASSWORD, RoleCodes.INSPECTOR);
        UUID clientUserId = userSeeder.createIfMissing(context, "farmer@agricert.co.ke", "Farmer", "User", DEMO_PASSWORD, RoleCodes.CLIENT);

        UUID clientProfileId = findOrCreateClientProfile(context, clientUserId);
        findOrCreateSite(context.tenantId(), clientProfileId);
    }

    private UUID findOrCreateClientProfile(SeedContext context, UUID clientUserId) {
        List<UUID> existing = jdbcTemplate.queryForList("""
                select id from farmers
                where tenant_id = ? and phone = '+254712345678'
                order by created_at desc
                limit 1
                """, UUID.class, context.tenantId());
        if (!existing.isEmpty()) {
            UUID profileId = existing.getFirst();
            jdbcTemplate.update("""
                    update farmers
                    set user_id = ?, client_name = coalesce(client_name, 'Kamau Farm'), designation = 'FARMER_PRODUCER'
                    where id = ?
                    """, clientUserId, profileId);
            return profileId;
        }
        return jdbcTemplate.queryForObject("""
                insert into farmers(tenant_id, organization_id, user_id, first_name, last_name, phone, county, sub_county, client_name, designation)
                values (?, ?, ?, 'John', 'Kamau', '+254712345678', 'Kiambu', 'Kiambu', 'Kamau Farm', 'FARMER_PRODUCER')
                returning id
                """, UUID.class, context.tenantId(), context.organizationId(), clientUserId);
    }

    private void findOrCreateSite(UUID tenantId, UUID clientProfileId) {
        Integer existing = jdbcTemplate.queryForObject("""
                select count(*) from farms where tenant_id = ? and farmer_id = ? and name = 'Kamau Farm'
                """, Integer.class, tenantId, clientProfileId);
        if (existing != null && existing > 0) {
            return;
        }
        jdbcTemplate.update("""
                insert into farms(tenant_id, farmer_id, name, county, size_acres, primary_crop, latitude, longitude)
                values (?, ?, 'Kamau Farm', 'Kiambu', 5.5, 'Tea', -0.7893, 36.8172)
                """, tenantId, clientProfileId);
    }
}
