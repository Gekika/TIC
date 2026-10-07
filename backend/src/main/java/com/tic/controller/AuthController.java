package com.tic.controller;

import com.tic.dto.request.AccountSetupTokenRequest;
import com.tic.dto.request.ClientSignupRequest;
import com.tic.dto.request.CompleteAccountSetupRequest;
import com.tic.dto.request.ForgotPasswordRequest;
import com.tic.dto.request.LoginRequest;
import com.tic.dto.response.AccountSetupDetailsResponse;
import com.tic.dto.response.AccountSetupResponse;
import com.tic.dto.response.ForgotPasswordResponse;
import com.tic.dto.response.LoginResponse;
import com.tic.dto.response.LogoutResponse;
import com.tic.dto.response.RefreshResponse;
import com.tic.exception.ExternalServiceException;
import com.tic.service.AccountAccessService;
import com.tic.service.AuthService;
import com.tic.service.ClientSignupService;
import com.tic.shared.response.ApiResponse;
import com.tic.shared.tenancy.TenantContext;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/** Public authentication endpoints: login, client sign-up, password reset and account set-up links. */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private static final Logger LOGGER = LoggerFactory.getLogger(AuthController.class);
    private static final String REFRESH_COOKIE = "refreshToken";
    private static final String REFRESH_COOKIE_PATH = "/api/v1/auth";

    private final AuthService authService;
    private final ClientSignupService clientSignupService;
    private final AccountAccessService accountAccessService;

    public AuthController(AuthService authService, ClientSignupService clientSignupService, AccountAccessService accountAccessService) {
        this.authService = authService;
        this.clientSignupService = clientSignupService;
        this.accountAccessService = accountAccessService;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        var result = authService.login(TenantContext.requireTenantId(), request.email(), request.password());
        setRefreshCookie(response, "dev-refresh-token", Duration.ofDays(7));
        return ApiResponse.ok(result);
    }

    /** {@code /farmer-signup} is kept as an alias for older clients. */
    @PostMapping({"/client-signup", "/farmer-signup"})
    public ApiResponse<LoginResponse> clientSignup(@RequestBody ClientSignupRequest request, HttpServletResponse response) {
        var result = clientSignupService.signup(request);
        setRefreshCookie(response, "dev-refresh-token", Duration.ofDays(7));
        return ApiResponse.ok(result);
    }

    /** Placeholder until refresh tokens are implemented: the frontend re-logs in when the access token expires. */
    @PostMapping("/refresh")
    public ApiResponse<RefreshResponse> refresh() {
        return ApiResponse.ok(new RefreshResponse(""));
    }

    @PostMapping("/logout")
    public ApiResponse<LogoutResponse> logout(HttpServletResponse response) {
        setRefreshCookie(response, "", Duration.ZERO);
        return ApiResponse.ok(new LogoutResponse(true));
    }

    /** Always answers "accepted" so the endpoint cannot be used to discover which emails exist. */
    @PostMapping("/forgot-password")
    public ApiResponse<ForgotPasswordResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        try {
            accountAccessService.requestPasswordReset(TenantContext.requireTenantId(), request.email());
        } catch (ExternalServiceException emailFailure) {
            LOGGER.warn("Password reset email could not be sent: {}", emailFailure.getMessage());
        }
        return ApiResponse.ok(new ForgotPasswordResponse(
                true,
                "If an active account matches that email, a password reset link has been sent."
        ));
    }

    @PostMapping("/account-setup/validate")
    public ApiResponse<AccountSetupDetailsResponse> validateAccountSetup(@Valid @RequestBody AccountSetupTokenRequest request) {
        return ApiResponse.ok(accountAccessService.validate(TenantContext.requireTenantId(), request.token()));
    }

    @PostMapping("/account-setup/complete")
    public ApiResponse<AccountSetupResponse> completeAccountSetup(@Valid @RequestBody CompleteAccountSetupRequest request) {
        accountAccessService.complete(TenantContext.requireTenantId(), request);
        return ApiResponse.ok(new AccountSetupResponse(true));
    }

    private static void setRefreshCookie(HttpServletResponse response, String value, Duration maxAge) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(false)
                .sameSite("Strict")
                .path(REFRESH_COOKIE_PATH)
                .maxAge(maxAge)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
