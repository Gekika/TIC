import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Archive, ShieldAlert, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { ApiError, Organization } from "../../../shared/types/api.types";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { archiveOrganization, deleteOrganization, updateOrganizationLicense, type OrganizationLicensePayload } from "../api/organizations.api";

type LicenseManagementDialogProps = {
  organization: Organization;
  onClose: () => void;
};

function apiErrorMessage(error: unknown) {
  return error instanceof AxiosError
    ? ((error.response?.data as ApiError | undefined)?.error?.message ?? "Could not update the organization license.")
    : "Could not update the organization license.";
}

export function LicenseManagementDialog({ organization, onClose }: LicenseManagementDialogProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<OrganizationLicensePayload["status"]>(organization.licenseStatus);
  const [expiresAt, setExpiresAt] = useState(organization.licenseExpiresAt ?? "");
  const [notes, setNotes] = useState(organization.licenseNotes ?? "");
  const mutation = useMutation({
    mutationFn: (payload: OrganizationLicensePayload) => updateOrganizationLicense(organization.id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      onClose();
    }
  });
  const archiveMutation = useMutation({
    mutationFn: () => archiveOrganization(organization.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      onClose();
    }
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteOrganization(organization.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      onClose();
    }
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({ status, expiresAt: expiresAt || null, notes: notes.trim() });
  };

  const isBlocking = status !== "ACTIVE";
  const isPending = mutation.isPending || archiveMutation.isPending || deleteMutation.isPending;
  const actionError = mutation.error ?? archiveMutation.error ?? deleteMutation.error;

  const archive = () => {
    if (window.confirm(`Archive ${organization.name}? Its users will immediately lose access, while inspection history is preserved.`)) {
      archiveMutation.mutate();
    }
  };

  const permanentlyDelete = () => {
    if (window.confirm(`Permanently delete ${organization.name}? This is allowed only when it has no users, clients, or inspections, and cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="license-dialog-title">
      <button type="button" className="absolute inset-0 bg-tic-navy/55" aria-label="Close license settings" onClick={onClose} />
      <form className="relative w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-xl" onSubmit={submit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-tic-muted">Organization access</p>
            <h2 id="license-dialog-title" className="mt-1 text-xl font-bold text-tic-navy">Manage license</h2>
            <p className="mt-1 text-sm text-tic-muted">{organization.name}</p>
          </div>
          <button type="button" className="rounded-md p-2 text-tic-muted hover:bg-slate-100" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label className="text-sm font-semibold text-tic-navy" htmlFor="license-status">License status</label>
            <select
              id="license-status"
              className="mt-1 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-tic-green focus:ring-2 focus:ring-tic-green/15"
              value={status}
              onChange={(event) => setStatus(event.target.value as OrganizationLicensePayload["status"])}
            >
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended for nonpayment</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-tic-navy" htmlFor="license-expiry">Expiry date (optional)</label>
            <Input id="license-expiry" className="mt-1" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold text-tic-navy" htmlFor="license-notes">Administrative note</label>
            <textarea
              id="license-notes"
              className="mt-1 min-h-24 w-full resize-y rounded-md border border-slate-200 bg-white p-3 text-sm outline-none focus:border-tic-green focus:ring-2 focus:ring-tic-green/15"
              maxLength={1000}
              placeholder="Payment reference, renewal details, or reason for suspension"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>

        {isBlocking ? (
          <div className="mt-5 flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            Saving this status will immediately block this organization&apos;s users from signing in and using active sessions.
          </div>
        ) : null}

        {actionError ? (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {apiErrorMessage(actionError)}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button type="submit" disabled={isPending}>
            {mutation.isPending ? "Saving..." : isBlocking ? "Block organization" : organization.active ? "Activate license" : "Restore and activate"}
          </Button>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <p className="text-sm font-semibold text-tic-navy">Organization lifecycle</p>
          <p className="mt-1 text-sm leading-6 text-tic-muted">
            Archive preserves reports and audit history. Permanent deletion is available only after archiving and only when no operational data exists.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {organization.active ? (
              <Button type="button" variant="secondary" onClick={archive} disabled={isPending} className="gap-2">
                <Archive className="h-4 w-4" aria-hidden="true" /> Archive organization
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={permanentlyDelete} disabled={isPending} className="gap-2 border-red-200 text-red-700 hover:bg-red-50">
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Permanently delete
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
