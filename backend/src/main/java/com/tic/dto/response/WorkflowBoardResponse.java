package com.tic.dto.response;

import java.util.List;

/**
 * Everything the inspection workflow page needs in one call, already filtered to what the caller may see.
 * ({@code farmers}/{@code farms} keep their legacy names: they hold clients and sites.)
 */
public record WorkflowBoardResponse(
        List<InspectionRequestResponse> requests,
        List<LookupItemResponse> farmers,
        List<LookupItemResponse> farms,
        List<LookupItemResponse> commodities,
        List<LookupItemResponse> standards,
        List<LookupItemResponse> formTemplates,
        List<LookupItemResponse> inspectors,
        List<FormQuestionResponse> formQuestions,
        ClientProfileResponse clientProfile
) {
}
