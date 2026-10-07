import { apiClient } from "../../../shared/lib/apiClient";
import type { ApiResponse, Organization } from "../../../shared/types/api.types";

export async function getOrganizations() {
  const response = await apiClient.get<ApiResponse<Organization[]>>("/organizations");
  return response.data.data;
}

export async function createOrganization(payload: {
  name: string;
  type: string;
  county: string;
  contactEmail: string;
  contactPhone: string;
}) {
  const response = await apiClient.post<ApiResponse<Organization>>("/organizations", payload);
  return response.data.data;
}

export type OrganizationLicensePayload = {
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  expiresAt: string | null;
  notes: string;
};

export async function updateOrganizationLicense(id: string, payload: OrganizationLicensePayload) {
  const response = await apiClient.patch<ApiResponse<Organization>>(`/organizations/${id}/license`, payload);
  return response.data.data;
}

export async function archiveOrganization(id: string) {
  const response = await apiClient.patch<ApiResponse<Organization>>(`/organizations/${id}/archive`);
  return response.data.data;
}

export async function deleteOrganization(id: string) {
  await apiClient.delete(`/organizations/${id}`);
}
