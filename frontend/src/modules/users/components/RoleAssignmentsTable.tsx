import { Plus, X } from "lucide-react";
import { useState } from "react";
import type { RoleCode, User } from "../../../shared/types/api.types";
import { Button } from "../../../shared/ui/Button";

type RoleAssignmentsTableProps = {
  users: User[];
  currentUser: User | null;
  organizationNames: Map<string, string>;
  pendingRoleChange: string | null;
  onRoleChange: (user: User, roleCode: RoleCode, action: "ADD" | "REMOVE") => void;
};

const assignableRoles: RoleCode[] = ["ORG_ADMIN", "SUPERVISOR", "INSPECTOR", "FARMER"];

const roleLabels: Record<RoleCode, string> = {
  SYSTEM_ADMIN: "System Administrator",
  ORG_ADMIN: "Organization Administrator",
  SUPERVISOR: "Supervisor",
  INSPECTOR: "Inspector",
  FARMER: "Client"
};

export function RoleAssignmentsTable({
  users,
  currentUser,
  organizationNames,
  pendingRoleChange,
  onRoleChange
}: RoleAssignmentsTableProps) {
  const [selectedRoles, setSelectedRoles] = useState<Partial<Record<string, RoleCode>>>({});
  const rolesAvailableToAdmin = currentUser?.roles.includes("SYSTEM_ADMIN")
    ? (["SYSTEM_ADMIN", ...assignableRoles] satisfies RoleCode[])
    : assignableRoles;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[920px] divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-tic-muted">User</th>
            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-tic-muted">Organization</th>
            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-tic-muted">Assigned roles</th>
            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-tic-muted">Assign role</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => {
            const availableRoles = rolesAvailableToAdmin.filter((role) => !user.roles.includes(role));
            const selectedRole = selectedRoles[user.id];
            const roleToAdd = selectedRole && availableRoles.includes(selectedRole) ? selectedRole : availableRoles[0];

            return (
              <tr key={user.id} className="align-top hover:bg-slate-50/60">
                <td className="px-5 py-5">
                  <p className="text-sm font-semibold text-tic-navy">{user.name}</p>
                  <p className="mt-1 text-xs text-tic-muted">{user.email}</p>
                </td>
                <td className="px-5 py-5 text-sm text-tic-navy">
                  {user.organizationId ? (organizationNames.get(user.organizationId) ?? "Organization unavailable") : "Platform"}
                </td>
                <td className="min-w-[330px] px-5 py-5">
                  <div className="flex flex-wrap gap-2" aria-label={`Roles assigned to ${user.name}`}>
                    {user.roles.map((role) => {
                      const protectedSelfRole = user.id === currentUser?.id && (role === "SYSTEM_ADMIN" || role === "ORG_ADMIN");
                      const canManageRole = role !== "SYSTEM_ADMIN" || currentUser?.roles.includes("SYSTEM_ADMIN");
                      return (
                        <span key={role} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 pl-3 pr-1 text-xs font-semibold text-tic-navy">
                          {roleLabels[role]}
                          {canManageRole && !protectedSelfRole ? (
                            <button
                              type="button"
                              className="inline-flex h-6 w-6 items-center justify-center rounded text-tic-muted hover:bg-red-100 hover:text-red-700 disabled:opacity-50"
                              aria-label={`Revoke ${roleLabels[role]} from ${user.name}`}
                              title={`Revoke ${roleLabels[role]}`}
                              disabled={pendingRoleChange !== null}
                              onClick={() => onRoleChange(user, role, "REMOVE")}
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          ) : null}
                        </span>
                      );
                    })}
                    {user.roles.length === 0 ? <span className="text-sm text-tic-muted">No roles assigned</span> : null}
                  </div>
                </td>
                <td className="min-w-[300px] px-5 py-5">
                  {roleToAdd ? (
                    <div className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={`assign-role-${user.id}`}>Role to assign to {user.name}</label>
                      <select
                        id={`assign-role-${user.id}`}
                        className="h-10 min-w-0 flex-1 rounded-md border border-dashed border-slate-300 bg-white px-3 text-sm text-tic-navy"
                        value={roleToAdd}
                        disabled={pendingRoleChange !== null}
                        onChange={(event) => setSelectedRoles((current) => ({ ...current, [user.id]: event.target.value as RoleCode }))}
                      >
                        {availableRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
                      </select>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-10 w-10 p-0"
                        aria-label={`Assign ${roleLabels[roleToAdd]} to ${user.name}`}
                        title="Assign selected role"
                        disabled={pendingRoleChange !== null}
                        onClick={() => onRoleChange(user, roleToAdd, "ADD")}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-tic-muted">All available roles assigned</span>
                  )}
                </td>
              </tr>
            );
          })}
          {users.length === 0 ? (
            <tr>
              <td className="px-5 py-12 text-center text-sm text-tic-muted" colSpan={4}>No users match the selected filters.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
