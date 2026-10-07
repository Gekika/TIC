package com.tic.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tic.security.JsonSecurityErrorHandler;
import com.tic.security.JwtAuthenticationFilter;
import com.tic.security.JwtService;
import com.tic.security.OrganizationLicenseFilter;
import com.tic.service.OrganizationLicenseService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Stateless JWT security:
 * <ul>
 *     <li>{@link JwtAuthenticationFilter} turns a valid bearer token into an authenticated {@code CurrentUser}</li>
 *     <li>{@link OrganizationLicenseFilter} blocks users whose organization licence is inactive</li>
 *     <li>role checks happen per endpoint with {@code @PreAuthorize} and inside services</li>
 * </ul>
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    /** Endpoints reachable without a token. */
    private static final String[] PUBLIC_AUTH_ENDPOINTS = {
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            "/api/v1/auth/logout",
            "/api/v1/auth/client-signup",
            "/api/v1/auth/farmer-signup",
            "/api/v1/auth/forgot-password",
            "/api/v1/auth/account-setup/validate",
            "/api/v1/auth/account-setup/complete"
    };

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtService jwtService,
            OrganizationLicenseService licenseService,
            ObjectMapper objectMapper
    ) throws Exception {
        var errorHandler = new JsonSecurityErrorHandler(objectMapper);
        var jwtFilter = new JwtAuthenticationFilter(jwtService);
        var licenseFilter = new OrganizationLicenseFilter(licenseService, objectMapper);

        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(errorHandler)
                        .accessDeniedHandler(errorHandler)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, PUBLIC_AUTH_ENDPOINTS).permitAll()
                        .requestMatchers("/api/v1/public/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/error").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(licenseFilter, JwtAuthenticationFilter.class)
                .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(TicProperties properties) {
        var configuration = new CorsConfiguration();
        List<String> origins = properties.cors() == null || properties.cors().allowedOrigins() == null
                ? List.of()
                : properties.cors().allowedOrigins();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Tenant-ID", "X-Tenant-Slug"));
        configuration.setAllowCredentials(true);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
