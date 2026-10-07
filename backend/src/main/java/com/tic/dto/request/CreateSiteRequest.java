package com.tic.dto.request;

/** A client site (farm, cold room, ...). Stored in the {@code farms} table. */
public record CreateSiteRequest(
        String name,
        String county,
        String subCounty,
        String ward,
        Double sizeAcres,
        String primaryCrop,
        Double latitude,
        Double longitude,
        String siteType
) {
}
