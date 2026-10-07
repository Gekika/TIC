import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../../shared/hooks/useAuth";
import type { Organization } from "../../../shared/types/api.types";
import { getOrganizations } from "../api/organizations.api";
import { LicenseManagementDialog } from "../components/LicenseManagementDialog";
import { OrgForm } from "../components/OrgForm";

export function OrganizationsPage() {
  const { user } = useAuth();
  const organizations = useQuery({ queryKey: ["organizations"], queryFn: getOrganizations });
  const canCreateOrganizations = user?.roles.includes("SYSTEM_ADMIN") ?? false;
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-tic-navy">Organizations</h1>
        <p className="mt-2 text-sm text-tic-muted">
          {canCreateOrganizations
            ? "Manage tenant organizations and their isolated operating teams."
            : "View the organization assigned to your account. Its users, clients, inspections, and reports are isolated from other organizations."}
        </p>
      </div>
      {canCreateOrganizations ? <OrgForm /> : null}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[900px] divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-tic-muted">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-tic-muted">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-tic-muted">County</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-tic-muted">Workflow</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-tic-muted">License</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-tic-muted">Expires</th>
              {canCreateOrganizations ? <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-tic-muted">Action</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(organizations.data ?? []).map((org) => (
              <tr key={org.id}>
                <td className="px-4 py-4 text-sm font-semibold text-tic-navy">{org.name}</td>
                <td className="px-4 py-4 text-sm text-tic-muted">{org.type}</td>
                <td className="px-4 py-4 text-sm text-tic-muted">{org.county}</td>
                <td className="px-4 py-4 text-sm text-tic-muted">{org.workflowMode}</td>
                <td className="px-4 py-4 text-sm">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${org.licenseAccessible ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {!org.active ? "ARCHIVED" : org.licenseAccessible ? "ACTIVE" : org.licenseStatus === "ACTIVE" ? "EXPIRED" : org.licenseStatus}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-tic-muted">
                  {org.licenseExpiresAt ? new Date(`${org.licenseExpiresAt}T00:00:00`).toLocaleDateString() : "No expiry"}
                </td>
                {canCreateOrganizations ? (
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-tic-navy hover:bg-slate-50"
                      onClick={() => setSelectedOrganization(org)}
                    >
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      Manage
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedOrganization ? (
        <LicenseManagementDialog
          key={selectedOrganization.id}
          organization={selectedOrganization}
          onClose={() => setSelectedOrganization(null)}
        />
      ) : null}
    </div>
  );
}
