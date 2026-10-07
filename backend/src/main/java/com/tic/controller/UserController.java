package com.tic.controller;

import com.tic.dto.request.ChangeUserRoleRequest;
import com.tic.dto.request.ChangeUserStatusRequest;
import com.tic.dto.request.InviteUserRequest;
import com.tic.dto.request.UpdateUserRequest;
import com.tic.dto.response.EmailSentResponse;
import com.tic.dto.response.UserResponse;
import com.tic.security.CurrentUser;
import com.tic.service.AccountAccessService;
import com.tic.service.UserService;
import com.tic.shared.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    private static final int MAX_PAGE_SIZE = 200;

    private final UserService userService;
    private final AccountAccessService accountAccessService;

    public UserController(UserService userService, AccountAccessService accountAccessService) {
        this.userService = userService;
        this.accountAccessService = accountAccessService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN','SYSTEM_ADMIN')")
    public ApiResponse<List<UserResponse>> list(CurrentUser currentUser,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "100") int size) {
        var users = userService.list(PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE)), currentUser);
        return ApiResponse.paged(users.getContent(), users.getNumber(), users.getSize(), users.getTotalElements());
    }

    @PostMapping("/invite")
    @PreAuthorize("hasAuthority('USER_INVITE') or hasAnyRole('ORG_ADMIN','SYSTEM_ADMIN')")
    public ApiResponse<UserResponse> invite(CurrentUser currentUser, @Valid @RequestBody InviteUserRequest request) {
        return ApiResponse.ok(userService.invite(request, currentUser));
    }

    @GetMapping("/{id}")
    public ApiResponse<UserResponse> get(@PathVariable UUID id) {
        return ApiResponse.ok(userService.get(id));
    }

    @PatchMapping("/{id}")
    public ApiResponse<UserResponse> update(@PathVariable UUID id, @Valid @RequestBody UpdateUserRequest request) {
        return ApiResponse.ok(userService.update(id, request));
    }

    @PatchMapping("/{id}/roles")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','SYSTEM_ADMIN')")
    public ApiResponse<UserResponse> changeRoles(@PathVariable UUID id, CurrentUser currentUser,
                                                 @Valid @RequestBody ChangeUserRoleRequest request) {
        return ApiResponse.ok(userService.changeRole(id, request, currentUser));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','SYSTEM_ADMIN')")
    public ApiResponse<UserResponse> changeStatus(@PathVariable UUID id, CurrentUser currentUser,
                                                  @Valid @RequestBody ChangeUserStatusRequest request) {
        return ApiResponse.ok(userService.changeStatus(id, request, currentUser));
    }

    @PostMapping("/{id}/resend-invitation")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','SYSTEM_ADMIN')")
    public ApiResponse<EmailSentResponse> resendInvitation(@PathVariable UUID id, CurrentUser currentUser) {
        accountAccessService.resendInvitation(id, currentUser);
        return ApiResponse.ok(new EmailSentResponse(true));
    }

    @PostMapping("/{id}/password-reset")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','SYSTEM_ADMIN')")
    public ApiResponse<EmailSentResponse> sendPasswordReset(@PathVariable UUID id, CurrentUser currentUser) {
        accountAccessService.sendPasswordReset(id, currentUser);
        return ApiResponse.ok(new EmailSentResponse(true));
    }
}
