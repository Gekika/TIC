package com.tic.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tic.exception.TicException;
import com.tic.service.OrganizationLicenseService;
import com.tic.shared.response.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Rejects every authenticated request whose organization licence is suspended, expired or archived,
 * so a suspension takes effect immediately even for tokens that are still valid.
 * SYSTEM_ADMIN is never blocked.
 */
public class OrganizationLicenseFilter extends OncePerRequestFilter {
    private final OrganizationLicenseService licenseService;
    private final ObjectMapper objectMapper;

    public OrganizationLicenseFilter(OrganizationLicenseService licenseService, ObjectMapper objectMapper) {
        this.licenseService = licenseService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/api/v1/auth/") || path.startsWith("/api/v1/public/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof CurrentUser currentUser) {
            try {
                licenseService.requireAccessible(currentUser.tenantId(), currentUser.organizationId(), currentUser.roles());
            } catch (TicException exception) {
                SecurityContextHolder.clearContext();
                response.setStatus(exception.getStatus().value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                objectMapper.writeValue(
                        response.getWriter(),
                        ErrorResponse.of(exception.getCode(), exception.getMessage(), UUID.randomUUID().toString())
                );
                return;
            }
        }
        filterChain.doFilter(request, response);
    }
}
