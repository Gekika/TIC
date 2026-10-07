import { apiClient } from "../../../shared/lib/apiClient";
import type { ApiResponse, User } from "../../../shared/types/api.types";

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResult = {
  accessToken: string;
  user: User;
};

export async function login(payload: LoginPayload) {
  const response = await apiClient.post<ApiResponse<LoginResult>>("/auth/login", payload);
  return response.data.data;
}

export type ClientSignupPayload = {
  organizationId: string;
  clientName: string;
  designation: "FARMER_PRODUCER" | "AGGREGATOR" | "PROCESSOR" | "EXPORTER" | "IMPORTER";
  firstName: string;
  lastName: string;
  nationalId: string;
  phone: string;
  email: string;
  password: string;
  county: string;
  subCounty: string;
};

export type SignupOrganization = {
  id: string;
  name: string;
  county: string | null;
};

export async function getSignupOrganizations() {
  const response = await apiClient.get<ApiResponse<SignupOrganization[]>>("/public/organizations");
  return response.data.data;
}

export async function clientSignup(payload: ClientSignupPayload) {
  const response = await apiClient.post<ApiResponse<LoginResult>>("/auth/client-signup", payload);
  return response.data.data;
}

export async function logout() {
  await apiClient.post("/auth/logout");
}

export type ForgotPasswordResult = {
  accepted: boolean;
  message: string;
};

export async function requestPasswordReset(email: string) {
  const response = await apiClient.post<ApiResponse<ForgotPasswordResult>>("/auth/forgot-password", { email });
  return response.data.data;
}

export type AccountSetupDetails = {
  purpose: "INVITATION" | "PASSWORD_RESET";
  email: string;
  expiresAt: string;
  profileRequired: boolean;
};

export async function validateAccountSetup(token: string) {
  const response = await apiClient.post<ApiResponse<AccountSetupDetails>>("/auth/account-setup/validate", { token });
  return response.data.data;
}

export type CompleteAccountSetupPayload = {
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

export async function completeAccountSetup(payload: CompleteAccountSetupPayload) {
  await apiClient.post("/auth/account-setup/complete", payload);
}
