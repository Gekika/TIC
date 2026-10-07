package com.tic.exception;

import org.springframework.http.HttpStatus;

/** HTTP 409 - the request conflicts with existing data. */
public class ConflictException extends TicException {
    public ConflictException(String code, String message) {
        super(code, message, HttpStatus.CONFLICT);
    }
}
