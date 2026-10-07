package com.tic.dto.response;

import java.util.UUID;

/** {@code { "id": "..." }} - returned after creating something. */
public record IdResponse(UUID id) {
}
