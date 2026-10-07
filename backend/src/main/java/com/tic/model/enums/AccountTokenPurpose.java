package com.tic.model.enums;

/** Why a single-use account link was issued (account_setup_tokens.purpose). */
public enum AccountTokenPurpose {
    INVITATION,
    PASSWORD_RESET;

    /** @return true if {@code value} is exactly one of this enum's names. */
    public static boolean isValid(String value) {
        if (value == null) {
            return false;
        }
        for (AccountTokenPurpose candidate : values()) {
            if (candidate.name().equals(value)) {
                return true;
            }
        }
        return false;
    }
}
