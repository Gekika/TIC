package com.tic.seed;

import com.tic.config.TicProperties;
import com.tic.shared.constants.RoleCodes;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Runs once at start-up (after Flyway) when {@code tic.seed.enabled=true}. Every step is idempotent.
 * <ol>
 *     <li>reference data: tenant, default organization, roles, permissions, workflow, sample standard/form</li>
 *     <li>the first platform administrator from {@code tic.seed.admin-email / admin-password}</li>
 *     <li>optional demo accounts when {@code tic.seed.demo-users=true}</li>
 * </ol>
 * Existing users are never modified, so changed passwords survive restarts.
 */
@Component
public class DataSeeder implements CommandLineRunner {
    private static final Logger LOGGER = LoggerFactory.getLogger(DataSeeder.class);

    private final TicProperties.Seed settings;
    private final ReferenceDataSeeder referenceDataSeeder;
    private final UserSeeder userSeeder;
    private final DemoDataSeeder demoDataSeeder;

    public DataSeeder(TicProperties properties, ReferenceDataSeeder referenceDataSeeder,
                      UserSeeder userSeeder, DemoDataSeeder demoDataSeeder) {
        this.settings = properties.seed();
        this.referenceDataSeeder = referenceDataSeeder;
        this.userSeeder = userSeeder;
        this.demoDataSeeder = demoDataSeeder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (settings == null || !settings.enabled()) {
            LOGGER.info("Data seeding disabled (tic.seed.enabled=false)");
            return;
        }
        var context = referenceDataSeeder.seed();

        if (settings.adminEmail() == null || settings.adminEmail().isBlank()
                || settings.adminPassword() == null || settings.adminPassword().isBlank()) {
            LOGGER.warn("TIC_ADMIN_EMAIL / TIC_ADMIN_PASSWORD not set - no administrator account was seeded");
        } else {
            userSeeder.createIfMissing(context, settings.adminEmail(), "Admin", "User", settings.adminPassword(),
                    RoleCodes.SYSTEM_ADMIN, RoleCodes.ORG_ADMIN);
        }

        if (settings.demoUsers()) {
            demoDataSeeder.seed(context);
        }
        LOGGER.info("Data seeding finished (demo users: {})", settings.demoUsers());
    }
}
