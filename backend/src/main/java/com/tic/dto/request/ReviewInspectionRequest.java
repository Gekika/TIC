package com.tic.dto.request;

/**
 * Supervisor decision on a submitted inspection.
 *
 * @param decision     APPROVED completes the request; anything else rejects it
 * @param editedReport optional replacement for the inspector's notes
 */
public record ReviewInspectionRequest(String decision, String comments, String editedReport) {
    public boolean isApproved() {
        return "APPROVED".equals(decision);
    }
}
