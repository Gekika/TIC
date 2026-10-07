package com.tic.controller;

import com.tic.dto.response.PublicOrganizationResponse;
import com.tic.service.OrganizationService;
import com.tic.shared.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Unauthenticated: the organization picker on the client sign-up page. */
@RestController
@RequestMapping("/api/v1/public/organizations")
public class PublicOrganizationController {
    private final OrganizationService organizationService;

    public PublicOrganizationController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @GetMapping
    public ApiResponse<List<PublicOrganizationResponse>> listForSignup() {
        return ApiResponse.ok(organizationService.listOpenForSignup());
    }
}
