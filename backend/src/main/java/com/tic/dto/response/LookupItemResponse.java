package com.tic.dto.response;

import java.util.UUID;

/** An id + display label pair used to fill dropdowns. */
public record LookupItemResponse(UUID id, String label) {
}
