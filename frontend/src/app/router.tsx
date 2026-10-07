import { Navigate, type RouteObject } from "react-router-dom";
import type { ReactNode } from "react";
import { OperationsDashboardPage } from "../modules/dashboard/pages/OperationsDashboardPage";
import { LoginPage } from "../modules/auth/pages/LoginPage";
import { LandingPage } from "../modules/landing/pages/LandingPage";
import { AccountSetupPage } from "../modules/auth/pages/AccountSetupPage";
import { ForgotPasswordPage } from "../modules/auth/pages/ForgotPasswordPage";
import { FormBuilderPage } from "../modules/certification/pages/FormBuilderPage";
import { FarmRegistryPage } from "../modules/farmregistry/pages/FarmRegistryPage";
import { InspectionWorkflowPage } from "../modules/inspections/pages/InspectionWorkflowPage";
import { ClientSignupPage } from "../modules/auth/pages/FarmerSignupPage";
import { OrganizationsPage } from "../modules/organizations/pages/OrganizationsPage";
import { ReportsPage } from "../modules/reports/pages/ReportsPage";
import { UsersPage } from "../modules/users/pages/UsersPage";
import { Shell } from "../shared/ui/Shell";
import { useAuth } from "../shared/hooks/useAuth";
import type { RoleCode } from "../shared/types/api.types";

function RequireAuth() {
  const { user } = useAuth();
  return user ? <Shell /> : <Navigate to="/login" replace />;
}

function RequireRole({ allowed, children }: { allowed: RoleCode[]; children: ReactNode }) {
  const { user, landingPath } = useAuth();
  const roles = user?.roles ?? [];
  const hasAccess = roles.some((role) => allowed.includes(role));
  return hasAccess ? children : <Navigate to={user ? landingPath(user.roles) : "/login"} replace />;
}

export const routes: RouteObject[] = [
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/account-setup", element: <AccountSetupPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/client/signup", element: <ClientSignupPage /> },
  { path: "/farmer/signup", element: <Navigate to="/client/signup" replace /> },
  {
    element: <RequireAuth />,
    children: [
      { path: "/dashboard", element: <RequireRole allowed={["SYSTEM_ADMIN", "ORG_ADMIN", "SUPERVISOR", "INSPECTOR"]}><OperationsDashboardPage /></RequireRole> },
      { path: "/admin/dashboard", element: <Navigate to="/dashboard" replace /> },
      { path: "/users", element: <RequireRole allowed={["SYSTEM_ADMIN", "ORG_ADMIN"]}><UsersPage /></RequireRole> },
      { path: "/organizations", element: <RequireRole allowed={["SYSTEM_ADMIN"]}><OrganizationsPage /></RequireRole> },
      { path: "/inspection-requests", element: <RequireRole allowed={["SYSTEM_ADMIN", "ORG_ADMIN"]}><InspectionWorkflowPage mode="admin" /></RequireRole> },
      { path: "/supervisor/queue", element: <RequireRole allowed={["SYSTEM_ADMIN", "ORG_ADMIN", "SUPERVISOR"]}><InspectionWorkflowPage mode="supervisor" /></RequireRole> },
      { path: "/inspector/jobs", element: <RequireRole allowed={["SYSTEM_ADMIN", "ORG_ADMIN", "INSPECTOR"]}><InspectionWorkflowPage mode="inspector" /></RequireRole> },
      { path: "/client/dashboard", element: <RequireRole allowed={["SYSTEM_ADMIN", "ORG_ADMIN", "FARMER"]}><InspectionWorkflowPage mode="farmer" /></RequireRole> },
      { path: "/farmer/dashboard", element: <Navigate to="/client/dashboard" replace /> },
      { path: "/farms", element: <RequireRole allowed={["SYSTEM_ADMIN", "ORG_ADMIN", "SUPERVISOR", "INSPECTOR"]}><FarmRegistryPage /></RequireRole> },
      { path: "/farmers", element: <RequireRole allowed={["SYSTEM_ADMIN", "ORG_ADMIN", "SUPERVISOR", "INSPECTOR"]}><FarmRegistryPage /></RequireRole> },
      { path: "/forms", element: <RequireRole allowed={["SYSTEM_ADMIN", "ORG_ADMIN", "SUPERVISOR"]}><FormBuilderPage /></RequireRole> },
      { path: "/reports", element: <RequireRole allowed={["SYSTEM_ADMIN", "ORG_ADMIN", "SUPERVISOR", "INSPECTOR", "FARMER"]}><ReportsPage /></RequireRole> },
      { path: "*", element: <Navigate to="/" replace /> }
    ]
  }
];
