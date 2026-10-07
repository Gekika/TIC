package com.tic.exception;

import org.springframework.http.HttpStatus;

/** HTTP 401 - the caller could not be authenticated. */
public class UnauthorizedException extends TicException {
    public UnauthorizedException(String code, String message) {
        super(code, message, HttpStatus.UNAUTHORIZED);
    }
}
