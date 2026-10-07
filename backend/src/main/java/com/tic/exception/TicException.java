package com.tic.exception;

import org.springframework.http.HttpStatus;

/**
 * Base class for every expected (business) error. The {@code code} is a stable,
 * machine-readable identifier the frontend can switch on; the message is shown to users.
 */
public class TicException extends RuntimeException {
    private final String code;
    private final HttpStatus status;

    public TicException(String code, String message, HttpStatus status) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
