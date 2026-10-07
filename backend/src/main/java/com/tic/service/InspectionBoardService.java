package com.tic.service;

import com.tic.dto.response.ClientProfileResponse;
import com.tic.dto.response.InspectionRequestResponse;
import com.tic.dto.response.LookupItemResponse;
import com.tic.dto.response.WorkflowBoardResponse;
import com.tic.exception.ForbiddenException;
import com.tic.repository.ClientRepository;
import com.tic.repository.InspectionBoardRepository;
import com.tic.security.CurrentUser;
import com.tic.shared.tenancy.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Builds the inspection workflow page data, scoped to what the caller may see:
 * <ul>
 *     <li>SYSTEM_ADMIN - everything in the tenant</li>
 *     <li>ORG_ADMIN / SUPERVISOR - their organization</li>
 *     <li>INSPECTOR - requests assigned to them</li>
 *     <li>client - their own requests and sites</li>
 * </ul>
 */
@Service
public class InspectionBoardService {
    private final InspectionBoardRepository boardRepository;
    private final ClientRepository clientRepository;

    public InspectionBoardService(InspectionBoardRepository boardRepository, ClientRepository clientRepository) {
        this.boardRepository = boardRepository;
        this.clientRepository = clientRepository;
    }

    @Transactional(readOnly = true)
    public WorkflowBoardResponse board(CurrentUser user) {
        UUID tenantId = TenantContext.requireTenantId();
        return new WorkflowBoardResponse(
                requestsVisibleTo(user, tenantId),
                clientsVisibleTo(user, tenantId),
                sitesVisibleTo(user, tenantId),
                boardRepository.findCommodities(tenantId),
                boardRepository.findStandards(tenantId),
                boardRepository.findPublishedFormTemplates(tenantId),
                assignableInspectors(user, tenantId),
                boardRepository.findFormQuestions(tenantId),
                clientProfileOf(user, tenantId)
        );
    }

    private List<InspectionRequestResponse> requestsVisibleTo(CurrentUser user, UUID tenantId) {
        if (user.isSystemAdmin()) {
            return boardRepository.findRequests(tenantId);
        }
        if (user.isOrganizationOperator()) {
            return boardRepository.findRequestsOfOrganization(tenantId, requireOrganizationId(user));
        }
        if (user.isClient()) {
            return boardRepository.findRequestsMadeBy(tenantId, user.id());
        }
        if (user.isInspector()) {
            return boardRepository.findRequestsAssignedTo(tenantId, user.id());
        }
        return List.of();
    }

    private List<LookupItemResponse> clientsVisibleTo(CurrentUser user, UUID tenantId) {
        if (user.isSystemAdmin()) {
            return boardRepository.findClients(tenantId);
        }
        if (user.isOrganizationOperator()) {
            return boardRepository.findClientsOfOrganization(tenantId, requireOrganizationId(user));
        }
        if (user.isInspector()) {
            return boardRepository.findClientsForInspector(tenantId, user.id());
        }
        if (user.isClient()) {
            return boardRepository.findClientsOfUser(tenantId, user.id());
        }
        return List.of();
    }

    private List<LookupItemResponse> sitesVisibleTo(CurrentUser user, UUID tenantId) {
        if (user.isSystemAdmin()) {
            return boardRepository.findSites(tenantId);
        }
        if (user.isOrganizationOperator()) {
            return boardRepository.findSitesOfOrganization(tenantId, requireOrganizationId(user));
        }
        if (user.isInspector()) {
            return boardRepository.findSitesForInspector(tenantId, user.id());
        }
        if (user.isClient()) {
            return boardRepository.findSitesOfUser(tenantId, user.id());
        }
        return List.of();
    }

    private List<LookupItemResponse> assignableInspectors(CurrentUser user, UUID tenantId) {
        if (user.isSystemAdmin()) {
            return boardRepository.findActiveInspectors(tenantId);
        }
        if (user.isOrganizationOperator()) {
            return boardRepository.findActiveInspectorsOfOrganization(tenantId, requireOrganizationId(user));
        }
        return List.of();
    }

    private ClientProfileResponse clientProfileOf(CurrentUser user, UUID tenantId) {
        return user.isClient() ? clientRepository.findProfileForUser(tenantId, user.id()).orElse(null) : null;
    }

    private static UUID requireOrganizationId(CurrentUser user) {
        if (user.organizationId() == null) {
            throw new ForbiddenException("ORGANIZATION_REQUIRED", "Your account is not assigned to an organization");
        }
        return user.organizationId();
    }
}
