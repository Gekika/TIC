package com.tic.dto.response;

/** {@code { "ok": true }} - returned by actions that have nothing else to report. */
public record OkResponse(boolean ok) {
    public static OkResponse success() {
        return new OkResponse(true);
    }
}
