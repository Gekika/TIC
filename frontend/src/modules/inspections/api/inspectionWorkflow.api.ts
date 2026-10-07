import { apiClient } from "../../../shared/lib/apiClient";
import type { ApiResponse } from "../../../shared/types/api.types";

export type LookupItem = {
  id: string;
  label: string;
};

export type InspectionRequestRow = {
  id: string;
  organizationId: string;
  organizationName: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  inspectionType: string;
  classification: "ORIGIN" | "DESTINATION" | "DAMAGE";
  preferredDate: string | null;
  notes: string | null;
  formTemplateId: string | null;
  farmName: string;
  siteCounty: string;
  siteSubCounty: string | null;
  siteLatitude: number | null;
  siteLongitude: number | null;
  siteType: string;
  clientName: string;
  designation: string;
  serviceRequest: string | null;
  product: string | null;
  productSpecializations: string[];
  packagingType: string | null;
  atmosphereType: string | null;
  inspectionUnit: string | null;
  unitsPerPallet: number | null;
  palletCount: number | null;
  totalUnits: number | null;
  totalWeightKg: number | null;
  consignee: string | null;
  optionalRequirements: string[];
  standardName: string | null;
  formName: string | null;
  inspectorName: string | null;
  inspectorNotes: string | null;
  inspectionCapture: unknown;
  rejectionReason: string | null;
};

export type WorkflowBoard = {
  requests: InspectionRequestRow[];
  farmers: LookupItem[];
  farms: LookupItem[];
  commodities: LookupItem[];
  standards: LookupItem[];
  formTemplates: LookupItem[];
  inspectors: LookupItem[];
  formQuestions: Array<{
    formTemplateId: string;
    sectionTitle: string;
    questionText: string;
    questionType: string;
    required: boolean;
    critical: boolean;
  }>;
  clientProfile: {
    clientName: string;
    designation: string;
  } | null;
};

export async function getWorkflowBoard() {
  const response = await apiClient.get<ApiResponse<WorkflowBoard>>("/inspection-workflow");
  return response.data.data;
}

export async function createInspectionRequest(payload: {
  farmId: string;
  inspectionType: string;
  preferredDate: string;
  notes: string;
  classification: string;
  serviceRequest: string;
  product: string;
  productSpecializations: string[];
  packagingType: string;
  atmosphereType: string;
  inspectionUnit: string;
  unitsPerPallet: number;
  palletCount: number;
  totalUnits: number;
  totalWeightKg: number;
  consignee: string;
  optionalRequirements: string[];
}) {
  const response = await apiClient.post<ApiResponse<{ id: string }>>("/inspection-workflow/requests", payload);
  return response.data.data;
}

export async function createFarm(payload: {
  name: string;
  county: string;
  subCounty: string;
  ward: string;
  sizeAcres: number;
  primaryCrop: string;
  latitude?: number;
  longitude?: number;
  siteType: string;
}) {
  const response = await apiClient.post<ApiResponse<{ id: string }>>("/inspection-workflow/farms", payload);
  return response.data.data;
}

export type UpdateClientRequestPayload = {
  siteName: string;
  county: string;
  subCounty: string;
  latitude?: number;
  longitude?: number;
  inspectionType: string;
  classification: "ORIGIN" | "DESTINATION" | "DAMAGE";
  inspectionDate: string;
  notes: string;
  serviceRequest: string;
  product: string;
  productSpecializations: string[];
  packagingType: string;
  atmosphereType: string;
  inspectionUnit: string;
  unitsPerPallet: number;
  palletCount: number;
  totalUnits: number;
  totalWeightKg: number;
  consignee: string;
  optionalRequirements: string[];
};

export async function updateClientRequest(requestId: string, payload: UpdateClientRequestPayload) {
  await apiClient.patch(`/inspection-workflow/requests/${requestId}/client-details`, payload);
}

export async function selectStandard(requestId: string, payload: { standardId: string; formTemplateId: string }) {
  await apiClient.patch(`/inspection-workflow/requests/${requestId}/standard`, payload);
}

export async function assignInspector(requestId: string, payload: { inspectorId: string; scheduledDate: string }) {
  await apiClient.post(`/inspection-workflow/requests/${requestId}/assign`, payload);
}

export async function startInspection(requestId: string) {
  await apiClient.post(`/inspection-workflow/requests/${requestId}/start`);
}

export async function saveInspectionDraft(requestId: string, payload: { moreInfo: string; captureData: unknown }) {
  await apiClient.post(`/inspection-workflow/requests/${requestId}/draft`, payload);
}

export async function submitInspectionWithNotes(requestId: string, moreInfo: string, captureData: unknown) {
  await apiClient.post(`/inspection-workflow/requests/${requestId}/submit`, { moreInfo, captureData });
}

export async function reviewInspection(requestId: string, payload: { decision: "APPROVED" | "REJECTED"; comments: string; editedReport?: string }) {
  await apiClient.post(`/inspection-workflow/requests/${requestId}/review`, payload);
}
