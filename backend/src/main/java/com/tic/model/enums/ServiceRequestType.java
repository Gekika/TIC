package com.tic.model.enums;

/** Service a client can request (inspection_requests.service_request). */
public enum ServiceRequestType {
    FIELD_ORCHARD,
    PSI,
    QUALITY_ASSURANCE,
    QUALITY_ASSESSMENT,
    DESTINATION_INSPECTION;

    /** @return true if {@code value} is exactly one of this enum's names. */
    public static boolean isValid(String value) {
        if (value == null) {
            return false;
        }
        for (ServiceRequestType candidate : values()) {
            if (candidate.name().equals(value)) {
                return true;
            }
        }
        return false;
    }
}
