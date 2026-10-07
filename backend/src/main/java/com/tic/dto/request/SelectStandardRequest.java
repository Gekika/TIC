package com.tic.dto.request;

import java.util.UUID;

public record SelectStandardRequest(UUID standardId, UUID formTemplateId) {
}
