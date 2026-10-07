package com.tic.shared.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tic.exception.BadRequestException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Converts between Java values and the JSON text stored in PostgreSQL {@code jsonb} columns.
 * Reads are lenient (bad JSON becomes an empty value); writes fail with a 400.
 */
@Component
public class JsonHelper {
    private final ObjectMapper objectMapper;

    public JsonHelper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String writeList(List<String> values) {
        return write(values == null ? List.of() : values, "INVALID_REQUEST_DATA", "Could not store the selected request options");
    }

    public String writeObject(Object value) {
        return write(value == null ? Map.of() : value, "INVALID_INSPECTION_CAPTURE", "Could not store the inspection capture");
    }

    public List<String> readList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException exception) {
            return List.of();
        }
    }

    public Map<String, Object> readObject(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException exception) {
            return Map.of();
        }
    }

    private String write(Object value, String errorCode, String errorMessage) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new BadRequestException(errorCode, errorMessage);
        }
    }
}
