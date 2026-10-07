package com.tic.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** A client's service request for an inspection at one of their sites ({@code farmId}). */
public record CreateInspectionRequestRequest(
        UUID farmId,
        String inspectionType,
        LocalDate preferredDate,
        String notes,
        String classification,
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
        List<String> optionalRequirements
) {
}
