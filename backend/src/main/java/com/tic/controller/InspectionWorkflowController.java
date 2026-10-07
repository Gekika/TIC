package com.tic.controller;

import com.tic.dto.request.AssignInspectorRequest;
import com.tic.dto.request.CreateInspectionRequestRequest;
import com.tic.dto.request.CreateSiteRequest;
import com.tic.dto.request.InspectionCaptureRequest;
import com.tic.dto.request.ReviewInspectionRequest;
import com.tic.dto.request.SelectStandardRequest;
import com.tic.dto.request.UpdateClientRequestDetailsRequest;
import com.tic.dto.response.IdResponse;
import com.tic.dto.response.OkResponse;
import com.tic.dto.response.StartInspectionResponse;
import com.tic.dto.response.WorkflowBoardResponse;
import com.tic.security.CurrentUser;
import com.tic.service.InspectionBoardService;
import com.tic.service.InspectionWorkflowService;
import com.tic.shared.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Inspection requests from client submission to supervisor review. Role checks live in the services. */
@RestController
@RequestMapping("/api/v1/inspection-workflow")
public class InspectionWorkflowController {
    private final InspectionBoardService boardService;
    private final InspectionWorkflowService workflowService;

    public InspectionWorkflowController(InspectionBoardService boardService, InspectionWorkflowService workflowService) {
        this.boardService = boardService;
        this.workflowService = workflowService;
    }

    @GetMapping
    public ApiResponse<WorkflowBoardResponse> board(CurrentUser user) {
        return ApiResponse.ok(boardService.board(user));
    }

    // client
    @PostMapping("/farms")
    public ApiResponse<IdResponse> createSite(CurrentUser user, @RequestBody CreateSiteRequest request) {
        return ApiResponse.ok(new IdResponse(workflowService.createSite(user, request)));
    }

    @PostMapping("/requests")
    public ApiResponse<IdResponse> createRequest(CurrentUser user, @RequestBody CreateInspectionRequestRequest request) {
        return ApiResponse.ok(new IdResponse(workflowService.createRequest(user, request)));
    }

    // supervisor / inspector
    @PatchMapping("/requests/{id}/client-details")
    public ApiResponse<OkResponse> updateClientRequest(@PathVariable UUID id, CurrentUser user,
                                                       @RequestBody UpdateClientRequestDetailsRequest request) {
        workflowService.updateClientRequest(id, user, request);
        return ApiResponse.ok(OkResponse.success());
    }

    // supervisor
    @PatchMapping("/requests/{id}/standard")
    public ApiResponse<OkResponse> selectStandard(@PathVariable UUID id, CurrentUser user, @RequestBody SelectStandardRequest request) {
        workflowService.selectStandard(id, user, request);
        return ApiResponse.ok(OkResponse.success());
    }

    @PostMapping("/requests/{id}/assign")
    public ApiResponse<OkResponse> assign(@PathVariable UUID id, CurrentUser user, @RequestBody AssignInspectorRequest request) {
        workflowService.assignInspector(id, user, request);
        return ApiResponse.ok(OkResponse.success());
    }

    @PostMapping("/requests/{id}/review")
    public ApiResponse<OkResponse> review(@PathVariable UUID id, CurrentUser user, @RequestBody ReviewInspectionRequest request) {
        workflowService.review(id, user, request);
        return ApiResponse.ok(OkResponse.success());
    }

    // inspector
    @PostMapping("/requests/{id}/start")
    public ApiResponse<StartInspectionResponse> start(@PathVariable UUID id, CurrentUser user) {
        return ApiResponse.ok(new StartInspectionResponse(workflowService.startInspection(id, user)));
    }

    @PostMapping("/requests/{id}/draft")
    public ApiResponse<OkResponse> saveDraft(@PathVariable UUID id, CurrentUser user, @RequestBody InspectionCaptureRequest request) {
        workflowService.saveInspectionDraft(id, user, request);
        return ApiResponse.ok(OkResponse.success());
    }

    @PostMapping("/requests/{id}/submit")
    public ApiResponse<OkResponse> submit(@PathVariable UUID id, CurrentUser user, @RequestBody InspectionCaptureRequest request) {
        workflowService.submitInspection(id, user, request);
        return ApiResponse.ok(OkResponse.success());
    }
}
