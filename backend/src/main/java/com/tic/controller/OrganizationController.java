package com.tic.controller;

import com.tic.dto.request.OrganizationRequest;
import com.tic.dto.request.UpdateLicenseRequest;
import com.tic.dto.request.WorkflowModeRequest;
import com.tic.dto.response.OrganizationResponse;
import com.tic.security.CurrentUser;
import com.tic.service.OrganizationService;
import com.tic.shared.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizations")
public class OrganizationController {
    private final OrganizationService organizationService;

    public OrganizationController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @GetMapping
    public ApiResponse<List<OrganizationResponse>> list(CurrentUser currentUser) {
        return ApiResponse.ok(organizationService.list(currentUser));
    }

    @PostMapping
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ApiResponse<OrganizationResponse> create(CurrentUser currentUser, @Valid @RequestBody OrganizationRequest request) {
        return ApiResponse.ok(organizationService.create(request, currentUser));
    }

    @GetMapping("/{id}")
    public ApiResponse<OrganizationResponse> get(@PathVariable UUID id, CurrentUser currentUser) {
        return ApiResponse.ok(organizationService.get(id, currentUser));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','SYSTEM_ADMIN')")
    public ApiResponse<OrganizationResponse> update(@PathVariable UUID id, CurrentUser currentUser,
                                                    @Valid @RequestBody OrganizationRequest request) {
        return ApiResponse.ok(organizationService.update(id, request, currentUser));
    }

    @PatchMapping("/{id}/workflow-mode")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','SYSTEM_ADMIN')")
    public ApiResponse<OrganizationResponse> updateWorkflowMode(@PathVariable UUID id, CurrentUser currentUser,
                                                                @RequestBody WorkflowModeRequest request) {
        return ApiResponse.ok(organizationService.updateWorkflowMode(id, request, currentUser));
    }

    @PatchMapping("/{id}/license")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ApiResponse<OrganizationResponse> updateLicense(@PathVariable UUID id, CurrentUser currentUser,
                                                           @Valid @RequestBody UpdateLicenseRequest request) {
        return ApiResponse.ok(organizationService.updateLicense(id, request, currentUser));
    }

    @PatchMapping("/{id}/archive")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ApiResponse<OrganizationResponse> archive(@PathVariable UUID id, CurrentUser currentUser) {
        return ApiResponse.ok(organizationService.archive(id, currentUser));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ApiResponse<Void> delete(@PathVariable UUID id, CurrentUser currentUser) {
        organizationService.delete(id, currentUser);
        return ApiResponse.ok(null);
    }
}
