import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Plus, RefreshCw, Search, ShieldCheck, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../../../shared/hooks/useAuth";
import type { ApiError, RoleCode, User } from "../../../shared/types/api.types";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { getOrganizations } from "../../organizations/api/organizations.api";
import {
  changeUserRole,
  changeUserStatus,
  getUsers,
  resendInvitation,
  sendPasswordReset
} from "../api/users.api";
import { InviteUserModal } from "../components/InviteUserModal";
import { RoleAssignmentsTable } from "../components/RoleAssignmentsTable";
import { UserTable, type AccountAction } from "../components/UserTable";

const roleLabels: Record<RoleCode, string> = {
  SYSTEM_ADMIN: "System Administrator",
  ORG_ADMIN: "Organization Administrator",
  SUPERVISOR: "Supervisor",
  INSPECTOR: "Inspector",
  FARMER: "Client"
};

function apiErrorMessage(error: unknown, fallback: string) {
  return error instanceof AxiosError
    ? ((error.response?.data as ApiError | undefined)?.error?.message ?? fallback)
    : fallback;
}

export function UsersPage() {
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"USERS" | "ROLES">("USERS");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleCode | "ALL">("ALL");
  const [organizationFilter, setOrganizationFilter] = useState("ALL");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const users = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
    refetchOnMount: "always",
    refetchInterval: 30_000
  });
  const organizations = useQuery({ queryKey: ["organizations"], queryFn: getOrganizations });
  const allOrganizations = useMemo(() => organizations.data ?? [], [organizations.data]);
  const organizationList = useMemo(() => {
    const uniqueByName = new Map<string, (typeof allOrganizations)[number]>();
    allOrganizations.forEach((organization) => {
      const key = organization.name.trim().toLocaleLowerCase();
      if (!uniqueByName.has(key)) uniqueByName.set(key, organization);
    });
    return Array.from(uniqueByName.values());
  }, [allOrganizations]);
  const organizationNames = useMemo(
    () => new Map(allOrganizations.map((organization) => [organization.id, organization.name])),
    [allOrganizations]
  );

  const roleMutation = useMutation({
    mutationFn: changeUserRole,
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      const verb = variables.action === "ADD" ? "assigned to" : "revoked from";
      setNotice({
        tone: "success",
        message: `${roleLabels[variables.roleCode]} was ${verb} the user. The change applies on their next sign-in.`
      });
    },
    onError: (error) => setNotice({ tone: "error", message: apiErrorMessage(error, "Could not update the user's roles.") })
  });

  const accountMutation = useMutation({
    mutationFn: async ({ user, action }: { user: User; action: AccountAction }) => {
      if (action === "RESEND_INVITATION") return resendInvitation(user.id);
      if (action === "PASSWORD_RESET") return sendPasswordReset(user.id);
      if (action === "SUSPEND") return changeUserStatus({ userId: user.id, status: "SUSPENDED" });
      if (action === "DEACTIVATE") return changeUserStatus({ userId: user.id, status: "DEACTIVATED" });
      return changeUserStatus({ userId: user.id, status: "ACTIVE" });
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      const messages: Record<AccountAction, string> = {
        RESEND_INVITATION: `A new invitation was sent to ${variables.user.email}.`,
        PASSWORD_RESET: `A password reset link was sent to ${variables.user.email}.`,
        SUSPEND: `${variables.user.name}'s account was suspended.`,
        ACTIVATE: `${variables.user.name}'s account is active.`,
        DEACTIVATE: `The invitation for ${variables.user.email} was cancelled.`
      };
      setNotice({ tone: "success", message: messages[variables.action] });
    },
    onError: (error) => setNotice({ tone: "error", message: apiErrorMessage(error, "Could not update this account.") })
  });

  const changeRole = (targetUser: User, roleCode: RoleCode, action: "ADD" | "REMOVE") => {
    const organizationId = targetUser.organizationId ?? organizationList[0]?.id;
    if (!organizationId) {
      setNotice({ tone: "error", message: "This user is not linked to an organization." });
      return;
    }
    if (action === "REMOVE" && !window.confirm(`Revoke the ${roleLabels[roleCode]} role from ${targetUser.name}?`)) return;
    setNotice(null);
    roleMutation.mutate({ userId: targetUser.id, roleCode, organizationId, action });
  };

  const changeAccount = (targetUser: User, action: AccountAction) => {
    if (action === "SUSPEND" && !window.confirm(`Suspend ${targetUser.name}? They will be unable to sign in.`)) return;
    if (action === "DEACTIVATE" && !window.confirm(`Cancel the invitation sent to ${targetUser.email}?`)) return;
    setNotice(null);
    accountMutation.mutate({ user: targetUser, action });
  };

  const allUsers = useMemo(() => users.data?.data ?? [], [users.data?.data]);
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allUsers.filter((user) => {
      const organizationName = user.organizationId ? organizationNames.get(user.organizationId) ?? "" : "platform";
      const matchesSearch = !term || `${user.name} ${user.email} ${organizationName}`.toLowerCase().includes(term);
      const matchesRole = roleFilter === "ALL" || user.roles.includes(roleFilter);
      const selectedOrganizationName = organizationNames.get(organizationFilter);
      const matchesOrganization = organizationFilter === "ALL"
        || (user.organizationId != null && organizationNames.get(user.organizationId) === selectedOrganizationName);
      return matchesSearch && matchesRole && matchesOrganization;
    });
  }, [allUsers, organizationFilter, organizationNames, roleFilter, search]);

  const pendingRoleChange = roleMutation.isPending && roleMutation.variables
    ? `${roleMutation.variables.userId}:${roleMutation.variables.roleCode}:${roleMutation.variables.action}`
    : null;

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-tic-navy">Users</h1>
          <p className="mt-2 text-sm text-tic-muted">Invite users, assign portal roles, and manage account access.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => users.refetch()} disabled={users.isFetching}>
            <RefreshCw className={`h-4 w-4 ${users.isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </Button>
          <Button onClick={() => setInviteOpen(true)} disabled={organizationList.length === 0}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Invite user
          </Button>
        </div>
      </div>

      {notice ? (
        <div
          className={`mt-6 flex items-center justify-between gap-4 rounded-md border px-4 py-3 text-sm ${
            notice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          <span>{notice.message}</span>
          <button type="button" className="font-semibold" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      ) : null}

      <div className="mt-7 inline-flex rounded-md border border-slate-200 bg-slate-50 p-1" role="tablist" aria-label="User management views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "USERS"}
          className={`inline-flex h-10 items-center gap-2 rounded px-4 text-sm font-semibold transition ${
            activeTab === "USERS" ? "bg-white text-tic-green shadow-sm" : "text-tic-muted hover:text-tic-navy"
          }`}
          onClick={() => setActiveTab("USERS")}
        >
          <UsersRound className="h-4 w-4" aria-hidden="true" />
          Users
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "ROLES"}
          className={`inline-flex h-10 items-center gap-2 rounded px-4 text-sm font-semibold transition ${
            activeTab === "ROLES" ? "bg-white text-tic-green shadow-sm" : "text-tic-muted hover:text-tic-navy"
          }`}
          onClick={() => setActiveTab("ROLES")}
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Role assignments
        </button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(280px,1fr)_240px_280px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tic-muted" aria-hidden="true" />
          <label className="sr-only" htmlFor="user-search">Search users</label>
          <Input id="user-search" className="pl-10" placeholder="Search by name, email, or organization" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <label className="sr-only" htmlFor="role-filter">Filter by role</label>
        <select id="role-filter" className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleCode | "ALL")}>
          <option value="ALL">All roles</option>
          {(Object.keys(roleLabels) as RoleCode[]).map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
        </select>
        <label className="sr-only" htmlFor="organization-filter">Filter by organization</label>
        <select id="organization-filter" className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm" value={organizationFilter} onChange={(event) => setOrganizationFilter(event.target.value)}>
          <option value="ALL">All organizations</option>
          {organizationList.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
        </select>
      </div>

      <div className="mt-5">
        {users.isLoading || organizations.isLoading ? (
          <div className="h-64 animate-pulse rounded-lg bg-white" />
        ) : users.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700" role="alert">
            {apiErrorMessage(users.error, "Could not load portal users.")}
          </div>
        ) : activeTab === "USERS" ? (
          <UserTable
            users={filteredUsers}
            currentUser={currentUser}
            organizationNames={organizationNames}
            pendingAccountUserId={accountMutation.isPending ? accountMutation.variables?.user.id ?? null : null}
            onAccountAction={changeAccount}
          />
        ) : (
          <RoleAssignmentsTable
            users={filteredUsers}
            currentUser={currentUser}
            organizationNames={organizationNames}
            pendingRoleChange={pendingRoleChange}
            onRoleChange={changeRole}
          />
        )}
      </div>
      <p className="mt-4 text-sm text-tic-muted">
        Showing {filteredUsers.length} of {allUsers.length} {activeTab === "USERS" ? "users" : "role assignments"}
      </p>

      {isInviteOpen ? (
        <InviteUserModal
          organizations={organizationList}
          canInviteSystemAdmin={currentUser?.roles.includes("SYSTEM_ADMIN") ?? false}
          onClose={() => setInviteOpen(false)}
          onInvited={(email) => {
            setInviteOpen(false);
            setNotice({ tone: "success", message: `Invitation sent to ${email}. The link expires in 7 days.` });
          }}
        />
      ) : null}
    </div>
  );
}
