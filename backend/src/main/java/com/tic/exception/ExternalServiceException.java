package com.tic.exception;

import org.springframework.http.HttpStatus;

/** HTTP 502 - a downstream service (e.g. SMTP) failed. */
public class ExternalServiceException extends TicException {
    public ExternalServiceException(String code, String message) {
        super(code, message, HttpStatus.BAD_GATEWAY);
    }
}
