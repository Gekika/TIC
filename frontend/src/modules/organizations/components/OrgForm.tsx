import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ApiError } from "../../../shared/types/api.types";
import { createOrganization } from "../api/organizations.api";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";

const schema = z.object({
  name: z.string().trim().min(2, "Enter the organization name"),
  type: z.enum(["CERTIFICATION_BODY", "INSPECTION_BODY", "INSPECTION_CERTIFICATION_BODY", "CLIENT_COMPANY", "COOPERATIVE"]),
  county: z.string().trim().min(2, "Enter the county"),
  contactEmail: z.string().trim().email("Enter a valid email address"),
  contactPhone: z.string().trim().min(7, "Enter a valid contact number")
});

type OrgValues = z.infer<typeof schema>;

function apiErrorMessage(error: unknown) {
  return error instanceof AxiosError
    ? ((error.response?.data as ApiError | undefined)?.error?.message ?? "Could not create the organization.")
    : "Could not create the organization.";
}

export function OrgForm() {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<OrgValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      type: "CERTIFICATION_BODY",
      county: "Nairobi",
      contactEmail: "",
      contactPhone: ""
    }
  });
  const mutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: async () => {
      reset();
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
    }
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-tic-navy">Create organization</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-semibold">Name</label>
          <Input {...register("name")} />
          {errors.name ? <p className="mt-1 text-xs text-tic-red">{errors.name.message}</p> : null}
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="organization-type">Type</label>
          <select
            id="organization-type"
            className="mt-1 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-tic-green focus:ring-2 focus:ring-tic-green/15"
            {...register("type")}
          >
            <option value="CERTIFICATION_BODY">Certification body</option>
            <option value="INSPECTION_BODY">Inspection body</option>
            <option value="INSPECTION_CERTIFICATION_BODY">Inspection and certification body</option>
            <option value="CLIENT_COMPANY">Client company</option>
            <option value="COOPERATIVE">Cooperative</option>
          </select>
          {errors.type ? <p className="mt-1 text-xs text-tic-red">{errors.type.message}</p> : null}
        </div>
        <div>
          <label className="text-sm font-semibold">County</label>
          <Input {...register("county")} />
        </div>
        <div>
          <label className="text-sm font-semibold">Contact email</label>
          <Input type="email" {...register("contactEmail")} />
        </div>
        <div>
          <label className="text-sm font-semibold">Contact phone</label>
          <Input {...register("contactPhone")} />
        </div>
      </div>
      {mutation.isError ? (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {apiErrorMessage(mutation.error)}
        </div>
      ) : null}
      <Button type="submit" className="mt-5" disabled={mutation.isPending}>{mutation.isPending ? "Creating..." : "Create Organization"}</Button>
    </form>
  );
}
