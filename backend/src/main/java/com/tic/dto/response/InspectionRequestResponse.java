package com.tic.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** One inspection request with its site, client, assignment and latest inspection/review details. */
public record InspectionRequestResponse(
        UUID id,
        UUID organizationId,
        String organizationName,
        Instant createdAt,
        Instant updatedAt,
        String status,
        String inspectionType,
        String classification,
        LocalDate preferredDate,
        String notes,
        UUID formTemplateId,
        String farmName,
        String siteCounty,
        String siteSubCounty,
        BigDecimal siteLatitude,
        BigDecimal siteLongitude,
        String siteType,
        String clientName,
        String designation,
        String serviceRequest,
        String product,
        List<String> productSpecializations,
        String packagingType,
        String atmosphereType,
        String inspectionUnit,
        Integer unitsPerPallet,
        Integer palletCount,
        Integer totalUnits,
        BigDecimal totalWeightKg,
        String consignee,
        List<String> optionalRequirements,
        String standardName,
        String formName,
        String inspectorName,
        String inspectorNotes,
        Map<String, Object> inspectionCapture,
        String rejectionReason
) {
}
