import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ApiError, Organization, RoleCode } from "../../../shared/types/api.types";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { inviteUser } from "../api/users.api";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  roleCode: z.enum(["SYSTEM_ADMIN", "ORG_ADMIN", "SUPERVISOR", "INSPECTOR", "FARMER"]),
  organizationId: z.string().uuid("Select an organization")
});

type InviteValues = z.infer<typeof schema>;

type InviteUserModalProps = {
  organizations: Organization[];
  canInviteSystemAdmin: boolean;
  onClose: () => void;
  onInvited: (email: string) => void;
};

const roleOptions: Array<{ value: RoleCode; label: string }> = [
  { value: "ORG_ADMIN", label: "Organization Administrator" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "INSPECTOR", label: "Inspector" },
  { value: "FARMER", label: "Client" }
];

export function InviteUserModal({ organizations, canInviteSystemAdmin, onClose, onInvited }: InviteUserModalProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<InviteValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      roleCode: "SUPERVISOR",
      organizationId: organizations[0]?.id ?? ""
    }
  });
  const mutation = useMutation({
    mutationFn: inviteUser,
    onSuccess: async (_, values) => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      onInvited(values.email);
    }
  });
  const mutationMessage = mutation.error instanceof AxiosError
    ? (mutation.error.response?.data as ApiError | undefined)?.error?.message
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tic-navy/60 p-4" role="presentation">
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-user-title"
      >
        <button
          type="button"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-md text-tic-muted hover:bg-slate-100 hover:text-tic-navy"
          aria-label="Close invitation dialog"
          onClick={onClose}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <h2 id="invite-user-title" className="pr-10 text-xl font-bold text-tic-navy">Invite user</h2>
        <p className="mt-2 pr-8 text-sm leading-6 text-tic-muted">
          They&apos;ll get an email with a secure link to set a password and join. The link expires in 7 days.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-tic-navy" htmlFor="invite-email">Email</label>
            <Input id="invite-email" type="email" autoComplete="email" placeholder="name@organization.co.ke" {...register("email")} />
            {errors.email ? <p className="mt-1 text-xs text-tic-red">{errors.email.message}</p> : null}
          </div>
          <div>
            <label className="text-sm font-semibold text-tic-navy" htmlFor="invite-organization">Organization</label>
            <select id="invite-organization" className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" {...register("organizationId")}>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name}</option>
              ))}
            </select>
            {errors.organizationId ? <p className="mt-1 text-xs text-tic-red">{errors.organizationId.message}</p> : null}
            <p className="mt-2 text-xs leading-5 text-tic-muted">Their role and permissions apply only within this organization.</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-tic-navy" htmlFor="invite-role">Initial role</label>
            <select id="invite-role" className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" {...register("roleCode")}>
              {canInviteSystemAdmin ? <option value="SYSTEM_ADMIN">System Administrator</option> : null}
              {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
          </div>
        </div>

        {mutation.isError ? (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {mutationMessage ?? "Could not send the invitation. Check the email and SMTP configuration, then try again."}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={mutation.isPending || organizations.length === 0}>
            {mutation.isPending ? "Sending..." : "Send invite"}
          </Button>
        </div>
      </form>
    </div>
  );
}
