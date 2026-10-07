package com.tic.model.enums;

/** Subscription state of an organization (organizations.license_status). */
public enum OrganizationLicenseStatus {
    ACTIVE,
    SUSPENDED,
    EXPIRED;

    /** @return true if {@code value} is exactly one of this enum's names. */
    public static boolean isValid(String value) {
        if (value == null) {
            return false;
        }
        for (OrganizationLicenseStatus candidate : values()) {
            if (candidate.name().equals(value)) {
                return true;
            }
        }
        return false;
    }
}
