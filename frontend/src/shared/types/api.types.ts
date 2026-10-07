export type ApiMeta = {
  page: number;
  pageSize: number;
  total: number;
};

export type ApiResponse<T> = {
  data: T;
  meta?: ApiMeta;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    fieldErrors: Array<{ field: string; message: string }>;
    traceId: string;
  };
};

export type RoleCode = "SYSTEM_ADMIN" | "ORG_ADMIN" | "SUPERVISOR" | "INSPECTOR" | "FARMER";

export type User = {
  id: string;
  tenantId: string;
  organizationId: string | null;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  lastLoginAt: string | null;
  roles: RoleCode[];
};

export type Organization = {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  county: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  workflowMode: string;
  active: boolean;
  licenseStatus: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  licenseExpiresAt: string | null;
  licenseNotes: string | null;
  licenseUpdatedAt: string | null;
  licenseUpdatedBy: string | null;
  licenseAccessible: boolean;
};
