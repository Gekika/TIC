package com.tic.model.enums;

/** Inspection point classification (inspection_requests.inspection_classification). */
public enum InspectionClassification {
    ORIGIN,
    DESTINATION,
    DAMAGE;

    /** @return true if {@code value} is exactly one of this enum's names. */
    public static boolean isValid(String value) {
        if (value == null) {
            return false;
        }
        for (InspectionClassification candidate : values()) {
            if (candidate.name().equals(value)) {
                return true;
            }
        }
        return false;
    }
}
