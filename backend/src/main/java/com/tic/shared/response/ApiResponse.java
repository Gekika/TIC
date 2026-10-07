package com.tic.shared.response;

/**
 * Envelope for every successful response: {@code { "data": ..., "meta": ... }}.
 */
public record ApiResponse<T>(T data, Meta meta) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(data, null);
    }

    public static <T> ApiResponse<T> paged(T data, int page, int pageSize, long total) {
        return new ApiResponse<>(data, new Meta(page, pageSize, total));
    }

    public record Meta(int page, int pageSize, long total) {
    }
}
