package com.tic.dto.request;

import java.util.Map;

/**
 * Inspector's field capture. Used both to save a draft and to submit.
 *
 * @param moreInfo    free-text inspector notes
 * @param captureData structured measurements (version, temperatures, pallet samples, ...)
 */
public record InspectionCaptureRequest(String moreInfo, Map<String, Object> captureData) {
}
