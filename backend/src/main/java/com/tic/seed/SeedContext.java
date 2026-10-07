package com.tic.seed;

import java.util.UUID;

/** Ids created by {@link ReferenceDataSeeder} that later seed steps need. */
public record SeedContext(UUID tenantId, UUID organizationId) {
}
