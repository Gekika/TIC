package com.tic.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Supervisor/inspector correction of a client's request and its site. */
public record UpdateClientRequestDetailsRequest(
        String siteName,
        String county,
        String subCounty,
        Double latitude,
        Double longitude,
        String inspectionType,
        String classification,
        LocalDate inspectionDate,
        String notes,
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
