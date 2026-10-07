package com.tic.dto.response;

public record LoginResponse(String accessToken, UserResponse user) {
}
