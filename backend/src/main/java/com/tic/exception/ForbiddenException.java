package com.tic.exception;

import org.springframework.http.HttpStatus;

/** HTTP 403 - the caller is authenticated but not allowed to do this. */
public class ForbiddenException extends TicException {
    public ForbiddenException(String code, String message) {
        super(code, message, HttpStatus.FORBIDDEN);
    }
}
