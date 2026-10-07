package com.tic.model.enums;

/** Where the goods are inspected (inspection_requests.inspection_unit). */
public enum InspectionUnit {
    COLD_ROOM,
    REEFER_UNIT,
    ORCHARD;

    /** @return true if {@code value} is exactly one of this enum's names. */
    public static boolean isValid(String value) {
        if (value == null) {
            return false;
        }
        for (InspectionUnit candidate : values()) {
            if (candidate.name().equals(value)) {
                return true;
            }
        }
        return false;
    }
}
