package com.tic.exception;

import org.springframework.http.HttpStatus;

/** HTTP 404 - the resource does not exist (in this tenant). */
public class NotFoundException extends TicException {
    public NotFoundException(String code, String message) {
        super(code, message, HttpStatus.NOT_FOUND);
    }
}
