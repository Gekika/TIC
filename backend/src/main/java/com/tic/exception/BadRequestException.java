package com.tic.exception;

import org.springframework.http.HttpStatus;

/** HTTP 400 - the request is invalid. */
public class BadRequestException extends TicException {
    public BadRequestException(String code, String message) {
        super(code, message, HttpStatus.BAD_REQUEST);
    }
}
