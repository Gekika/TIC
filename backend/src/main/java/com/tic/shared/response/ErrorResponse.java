package com.tic.shared.response;

import java.util.List;

/**
 * Envelope for every error response: {@code { "error": { code, message, fieldErrors, traceId } }}.
 */
public record ErrorResponse(ErrorBody error) {
    public static ErrorResponse of(String code, String message, String traceId) {
        return new ErrorResponse(new ErrorBody(code, message, List.of(), traceId));
    }

    public static ErrorResponse validation(List<FieldError> fieldErrors, String traceId) {
        return new ErrorResponse(new ErrorBody("VALIDATION_ERROR", "Validation failed", fieldErrors, traceId));
    }

    public record ErrorBody(String code, String message, List<FieldError> fieldErrors, String traceId) {
    }

    public record FieldError(String field, String message) {
    }
}
