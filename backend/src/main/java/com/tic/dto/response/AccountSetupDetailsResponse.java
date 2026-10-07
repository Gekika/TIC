package com.tic.dto.response;

import java.time.OffsetDateTime;

/** What the account-setup page needs to render for a valid link. */
public record AccountSetupDetailsResponse(String purpose, String email, OffsetDateTime expiresAt, boolean profileRequired) {
}
