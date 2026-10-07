import { apiClient } from "../../../shared/lib/apiClient";
import type { ApiResponse, RoleCode, User } from "../../../shared/types/api.types";

export async function getUsers() {
  const response = await apiClient.get<ApiResponse<User[]>>("/users");
  return response.data;
}

export async function inviteUser(payload: { email: string; roleCode: string; organizationId: string }) {
  const response = await apiClient.post<ApiResponse<User>>("/users/invite", payload);
  return response.data.data;
}

export type ChangeUserRoleInput = {
  userId: string;
  roleCode: RoleCode;
  organizationId: string;
  action: "ADD" | "REMOVE";
};

export async function changeUserRole({ userId, ...payload }: ChangeUserRoleInput) {
  const response = await apiClient.patch<ApiResponse<User>>(`/users/${userId}/roles`, payload);
  return response.data.data;
}

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export async function changeUserStatus({ userId, status }: { userId: string; status: UserStatus }) {
  const response = await apiClient.patch<ApiResponse<User>>(`/users/${userId}/status`, { status });
  return response.data.data;
}

export async function resendInvitation(userId: string) {
  await apiClient.post(`/users/${userId}/resend-invitation`);
}

export async function sendPasswordReset(userId: string) {
  await apiClient.post(`/users/${userId}/password-reset`);
}
