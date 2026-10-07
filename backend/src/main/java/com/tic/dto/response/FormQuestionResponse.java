package com.tic.dto.response;

import java.util.UUID;

public record FormQuestionResponse(
        UUID formTemplateId,
        String sectionTitle,
        String questionText,
        String questionType,
        boolean required,
        boolean critical
) {
}
