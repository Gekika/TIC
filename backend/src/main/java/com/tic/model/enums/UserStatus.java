package com.tic.model.enums;

/** Lifecycle of a user account (users.status). */
public enum UserStatus {
    ACTIVE,
    INVITED,
    SUSPENDED,
    DEACTIVATED;

    /** @return true if {@code value} is exactly one of this enum's names. */
    public static boolean isValid(String value) {
        if (value == null) {
            return false;
        }
        for (UserStatus candidate : values()) {
            if (candidate.name().equals(value)) {
                return true;
            }
        }
        return false;
    }
}
