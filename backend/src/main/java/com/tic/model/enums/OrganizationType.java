package com.tic.model.enums;

/** Kind of organization (organizations.type). */
public enum OrganizationType {
    CERTIFICATION_BODY,
    INSPECTION_BODY,
    INSPECTION_CERTIFICATION_BODY,
    CLIENT_COMPANY,
    COOPERATIVE;

    /** @return true if {@code value} is exactly one of this enum's names. */
    public static boolean isValid(String value) {
        if (value == null) {
            return false;
        }
        for (OrganizationType candidate : values()) {
            if (candidate.name().equals(value)) {
                return true;
            }
        }
        return false;
    }
}
