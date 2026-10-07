package com.tic.shared.constants;

/**
 * Role codes stored in the {@code roles.code} column.
 * <p>
 * Note: {@code FARMER} is the legacy code for what the UI now calls a "Client".
 */
public final class RoleCodes {
    public static final String SYSTEM_ADMIN = "SYSTEM_ADMIN";
    public static final String ORG_ADMIN = "ORG_ADMIN";
    public static final String SUPERVISOR = "SUPERVISOR";
    public static final String INSPECTOR = "INSPECTOR";
    public static final String CLIENT = "FARMER";

    private RoleCodes() {
    }
}
