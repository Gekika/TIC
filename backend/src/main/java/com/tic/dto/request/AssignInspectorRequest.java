package com.tic.dto.request;

import java.time.LocalDate;
import java.util.UUID;

public record AssignInspectorRequest(UUID inspectorId, LocalDate scheduledDate) {
}
