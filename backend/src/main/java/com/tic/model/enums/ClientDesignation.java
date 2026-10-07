package com.tic.model.enums;

/** What a client company does in the supply chain (farmers.designation). */
public enum ClientDesignation {
    FARMER_PRODUCER,
    AGGREGATOR,
    PROCESSOR,
    EXPORTER,
    IMPORTER;

    /** @return true if {@code value} is exactly one of this enum's names. */
    public static boolean isValid(String value) {
        if (value == null) {
            return false;
        }
        for (ClientDesignation candidate : values()) {
            if (candidate.name().equals(value)) {
                return true;
            }
        }
        return false;
    }
}
