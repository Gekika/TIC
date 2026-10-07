import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Sprout } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate } from "react-router-dom";
import { z } from "zod";
import { AxiosError } from "axios";
import { useAuth } from "../../../shared/hooks/useAuth";
import type { ApiError } from "../../../shared/types/api.types";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { getSignupOrganizations } from "../api/auth.api";

const schema = z.object({
  organizationId: z.string().uuid("Select the TIC organization that will manage your inspections"),
  clientName: z.string().min(2, "Client name is required"),
  designation: z.enum(["FARMER_PRODUCER", "AGGREGATOR", "PROCESSOR", "EXPORTER", "IMPORTER"]),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  nationalId: z.string(),
  phone: z.string().min(10),
  email: z.string().email(),
  password: z.string().min(8),
  county: z.string().min(2),
  subCounty: z.string().min(2)
});

type ClientSignupValues = z.infer<typeof schema>;

export function ClientSignupPage() {
  const { user, signupClient } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const organizations = useQuery({ queryKey: ["signup-organizations"], queryFn: getSignupOrganizations });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ClientSignupValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: "",
      designation: "FARMER_PRODUCER",
      nationalId: "",
      county: "Kiambu",
      subCounty: "Kiambu"
    }
  });

  if (user) {
    return <Navigate to="/client/dashboard" replace />;
  }

  return (
    <main className="min-h-screen bg-tic-surface px-5 py-10">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
        <section className="bg-tic-navy p-8 text-white lg:p-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-tic-green">
            <Sprout className="h-6 w-6" />
          </div>
          <h1 className="mt-8 text-4xl font-bold">Client Portal Signup</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Producers, aggregators, processors, exporters, and importers can self-register, submit service requests, and receive approved inspection reports. Supervisors and inspectors remain invitation-only.
          </p>
        </section>
        <section className="p-6 lg:p-10">
          <h2 className="text-2xl font-bold text-tic-navy">Create client account</h2>
          {error ? <div className="mt-4 rounded-md border border-tic-red/20 bg-tic-red/10 p-3 text-sm text-tic-red">{error}</div> : null}
          <form
            className="mt-6 grid gap-4 md:grid-cols-2"
            onSubmit={handleSubmit(async (values) => {
              setError(null);
              try {
                await signupClient(values);
              } catch (caught) {
                const errorMessage =
                  caught instanceof AxiosError
                    ? (caught.response?.data as ApiError | undefined)?.error?.message
                    : null;
                setError(errorMessage ?? "Could not create the client account. Check if the backend was rebuilt and is running.");
              }
            })}
          >
            <Field label="Client name" error={errors.clientName?.message}>
              <Input placeholder="Business, farm, or trading name" {...register("clientName")} />
            </Field>
            <Field label="TIC organization" error={errors.organizationId?.message}>
              <select className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" {...register("organizationId")}>
                <option value="">Select organization</option>
                {(organizations.data ?? []).map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}{organization.county ? ` - ${organization.county}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Designation" error={errors.designation?.message}>
              <select className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" {...register("designation")}>
                <option value="FARMER_PRODUCER">Farmer / Producer</option>
                <option value="AGGREGATOR">Aggregator</option>
                <option value="PROCESSOR">Processor</option>
                <option value="EXPORTER">Exporter</option>
                <option value="IMPORTER">Importer</option>
              </select>
            </Field>
            <Field label="Contact first name" error={errors.firstName?.message}><Input {...register("firstName")} /></Field>
            <Field label="Contact last name" error={errors.lastName?.message}><Input {...register("lastName")} /></Field>
            <Field label="National ID / registration no. (optional)" error={errors.nationalId?.message}><Input {...register("nationalId")} /></Field>
            <Field label="Phone" error={errors.phone?.message}><Input {...register("phone")} /></Field>
            <Field label="Email" error={errors.email?.message}><Input type="email" {...register("email")} /></Field>
            <Field label="Password" error={errors.password?.message}><Input type="password" {...register("password")} /></Field>
            <Field label="County" error={errors.county?.message}><Input {...register("county")} /></Field>
            <Field label="Sub-county" error={errors.subCounty?.message}><Input {...register("subCounty")} /></Field>
            <div className="md:col-span-2">
              <Button className="w-full" disabled={isSubmitting || organizations.isLoading || organizations.isError}>
                {isSubmitting ? "Creating account..." : "Create Client Account"}
              </Button>
              <p className="mt-4 text-center text-sm text-tic-muted">
                Already registered? <Link to="/login" className="font-semibold text-tic-green hover:underline">Sign in</Link>
              </p>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-tic-navy">
      {label}
      <div className="mt-1">{children}</div>
      {error ? <p className="mt-1 text-xs text-tic-red">{error}</p> : null}
    </label>
  );
}
