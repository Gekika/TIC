import { KeyRound, Mail, MoreVertical, UserRoundCheck, UserRoundX } from "lucide-react";
import { statusClassName } from "../../../shared/lib/status";
import type { User } from "../../../shared/types/api.types";

export type AccountAction = "RESEND_INVITATION" | "PASSWORD_RESET" | "SUSPEND" | "ACTIVATE" | "DEACTIVATE";

type UserTableProps = {
  users: User[];
  currentUser: User | null;
  organizationNames: Map<string, string>;
  pendingAccountUserId: string | null;
  onAccountAction: (user: User, action: AccountAction) => void;
};

const roleLabels: Record<User["roles"][number], string> = {
  SYSTEM_ADMIN: "System Administrator",
  ORG_ADMIN: "Organization Administrator",
  SUPERVISOR: "Supervisor",
  INSPECTOR: "Inspector",
  FARMER: "Client"
};

function relativeLogin(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000], ["month", 2_592_000], ["week", 604_800],
    ["day", 86_400], ["hour", 3_600], ["minute", 60]
  ];
  for (const [unit, divisor] of units) {
    if (Math.abs(seconds) >= divisor) return formatter.format(Math.round(seconds / divisor), unit);
  }
  return "just now";
}

function statusLabel(status: string) {
  return status.toLowerCase().split("_").join(" ").replace(/^./, (character: string) => character.toUpperCase());
}

export function UserTable({
  users,
  currentUser,
  organizationNames,
  pendingAccountUserId,
  onAccountAction
}: UserTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[1180px] divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-tic-muted">Name</th>
            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-tic-muted">Organization</th>
            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-tic-muted">Roles</th>
            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-tic-muted">Last login</th>
            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-tic-muted">Status</th>
            <th className="w-16 px-5 py-4"><span className="sr-only">Account actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => {
            const accountPending = pendingAccountUserId === user.id;
            const isCurrentUser = user.id === currentUser?.id;

            return (
              <tr key={user.id} className="align-top hover:bg-slate-50/60">
                <td className="px-5 py-5">
                  <p className="text-sm font-semibold text-tic-navy">{user.name}</p>
                  <p className="mt-1 text-xs text-tic-muted">{user.email}</p>
                </td>
                <td className="px-5 py-5 text-sm text-tic-navy">
                  {user.organizationId ? (organizationNames.get(user.organizationId) ?? "Organization unavailable") : "Platform"}
                </td>
                <td className="min-w-[380px] px-5 py-5">
                  <div className="flex flex-wrap gap-2" aria-label={`Roles assigned to ${user.name}`}>
                    {user.roles.map((role) => (
                      <span key={role} className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-tic-navy">
                        {roleLabels[role]}
                      </span>
                    ))}
                    {user.roles.length === 0 ? <span className="text-sm text-tic-muted">No roles assigned</span> : null}
                  </div>
                </td>
                <td className="px-5 py-5 text-sm text-tic-muted" title={user.lastLoginAt ?? undefined}>{relativeLogin(user.lastLoginAt)}</td>
                <td className="px-5 py-5">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(user.status)}`}>
                    {statusLabel(user.status)}
                  </span>
                </td>
                <td className="relative px-5 py-4 text-right">
                  <details className="group relative inline-block text-left">
                    <summary
                      className="inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md text-tic-muted hover:bg-slate-100 hover:text-tic-navy [&::-webkit-details-marker]:hidden"
                      aria-label={`Manage ${user.name}`}
                      title="Account actions"
                    >
                      <MoreVertical className="h-5 w-5" aria-hidden="true" />
                    </summary>
                    <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg">
                      {user.status === "INVITED" ? (
                        <>
                          <button type="button" className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50" disabled={accountPending} onClick={() => onAccountAction(user, "RESEND_INVITATION")}>
                            <Mail className="h-4 w-4" aria-hidden="true" /> Resend invitation
                          </button>
                          <button type="button" className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-tic-red hover:bg-red-50 disabled:opacity-50" disabled={accountPending} onClick={() => onAccountAction(user, "DEACTIVATE")}>
                            <UserRoundX className="h-4 w-4" aria-hidden="true" /> Cancel invitation
                          </button>
                        </>
                      ) : null}
                      {user.status === "ACTIVE" ? (
                        <>
                          <button type="button" className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50" disabled={accountPending} onClick={() => onAccountAction(user, "PASSWORD_RESET")}>
                            <KeyRound className="h-4 w-4" aria-hidden="true" /> Send password reset
                          </button>
                          {!isCurrentUser ? (
                            <button type="button" className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-tic-red hover:bg-red-50 disabled:opacity-50" disabled={accountPending} onClick={() => onAccountAction(user, "SUSPEND")}>
                              <UserRoundX className="h-4 w-4" aria-hidden="true" /> Suspend account
                            </button>
                          ) : null}
                        </>
                      ) : null}
                      {user.status === "SUSPENDED" || user.status === "DEACTIVATED" ? (
                        <button type="button" className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-tic-green hover:bg-emerald-50 disabled:opacity-50" disabled={accountPending} onClick={() => onAccountAction(user, "ACTIVATE")}>
                          <UserRoundCheck className="h-4 w-4" aria-hidden="true" /> Activate account
                        </button>
                      ) : null}
                    </div>
                  </details>
                </td>
              </tr>
            );
          })}
          {users.length === 0 ? (
            <tr>
              <td className="px-5 py-12 text-center text-sm text-tic-muted" colSpan={6}>No users match the selected filters.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
