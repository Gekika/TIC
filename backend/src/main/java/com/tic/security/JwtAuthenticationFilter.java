package com.tic.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

/**
 * Reads {@code Authorization: Bearer <jwt>} and, when valid, authenticates the request as a {@link CurrentUser}.
 * Roles become {@code ROLE_<code>} authorities; permissions are added as-is.
 * Created in {@code SecurityConfig} (not a {@code @Component}) so it only runs inside the security chain.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                CurrentUser currentUser = jwtService.parse(header.substring(7));
                var authorities = new ArrayList<SimpleGrantedAuthority>();
                currentUser.roles().forEach(role -> authorities.add(new SimpleGrantedAuthority("ROLE_" + role)));
                currentUser.permissions().forEach(permission -> authorities.add(new SimpleGrantedAuthority(permission)));
                var authentication = new UsernamePasswordAuthenticationToken(currentUser, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (RuntimeException invalidToken) {
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }
}
