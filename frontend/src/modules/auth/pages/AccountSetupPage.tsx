import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import type { ApiError } from "../../../shared/types/api.types";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { completeAccountSetup, validateAccountSetup } from "../api/auth.api";

const setupSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  password: z.string().min(8, "Use at least 8 characters"),
  confirmPassword: z.string()
}).refine((values) => values.password === values.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type SetupValues = z.infer<typeof setupSchema>;

function apiErrorMessage(error: unknown, fallback: string) {
  return error instanceof AxiosError
    ? ((error.response?.data as ApiError | undefined)?.error?.message ?? fallback)
    : fallback;
}

export function AccountSetupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const details = useQuery({
    queryKey: ["account-setup", token],
    queryFn: () => validateAccountSetup(token),
    enabled: token.length > 0,
    retry: false
  });
  const { register, handleSubmit, setError, formState: { errors } } = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: { firstName: "", lastName: "", password: "", confirmPassword: "" }
  });
  const mutation = useMutation({
    mutationFn: completeAccountSetup,
    onSuccess: () => navigate("/login?reason=account-ready", { replace: true })
  });

  const submit = (values: SetupValues) => {
    if (details.data?.profileRequired && !values.firstName.trim()) {
      setError("firstName", { message: "First name is required" });
      return;
    }
    if (details.data?.profileRequired && !values.lastName.trim()) {
      setError("lastName", { message: "Last name is required" });
      return;
    }
    mutation.mutate({
      token,
      password: values.password,
      firstName: values.firstName.trim() || undefined,
      lastName: values.lastName.trim() || undefined
    });
  };

  const invalidLink = !token || details.isError;

  return (
    <main className="grid min-h-screen bg-tic-navy lg:grid-cols-[1fr_1fr]">
      <section className="flex items-center px-6 py-12 text-white lg:px-16">
        <div className="max-w-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-tic-green">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-8 text-4xl font-bold tracking-normal lg:text-5xl">Secure account access</h1>
          <p className="mt-5 text-base leading-8 text-slate-300">
            Create your TIC Operations credentials from this single-use invitation or password-reset link.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-tic-surface px-6 py-12">
        <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          {details.isLoading ? (
            <div className="space-y-4" role="status">
              <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
              <div className="h-24 animate-pulse rounded bg-slate-100" />
              <span className="sr-only">Validating secure link</span>
            </div>
          ) : invalidLink ? (
            <div>
              <KeyRound className="h-9 w-9 text-tic-red" aria-hidden="true" />
              <h2 className="mt-5 text-2xl font-bold text-tic-navy">This link cannot be used</h2>
              <p className="mt-3 text-sm leading-6 text-tic-muted">
                {apiErrorMessage(details.error, "The account link is invalid, expired, or has already been used.")}
              </p>
              <Link className="mt-6 inline-flex font-semibold text-tic-green hover:underline" to="/login">Return to sign in</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(submit)} noValidate>
              <KeyRound className="h-9 w-9 text-tic-green" aria-hidden="true" />
              <h2 className="mt-5 text-2xl font-bold text-tic-navy">
                {details.data?.profileRequired ? "Accept your invitation" : "Set a new password"}
              </h2>
              <p className="mt-2 text-sm text-tic-muted">Account: {details.data?.email}</p>

              {details.data?.profileRequired ? (
                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-tic-navy" htmlFor="setup-first-name">First name</label>
                    <Input id="setup-first-name" autoComplete="given-name" {...register("firstName")} />
                    {errors.firstName ? <p className="mt-1 text-xs text-tic-red">{errors.firstName.message}</p> : null}
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-tic-navy" htmlFor="setup-last-name">Last name</label>
                    <Input id="setup-last-name" autoComplete="family-name" {...register("lastName")} />
                    {errors.lastName ? <p className="mt-1 text-xs text-tic-red">{errors.lastName.message}</p> : null}
                  </div>
                </div>
              ) : null}

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-tic-navy" htmlFor="setup-password">Password</label>
                  <Input id="setup-password" type="password" autoComplete="new-password" {...register("password")} />
                  {errors.password ? <p className="mt-1 text-xs text-tic-red">{errors.password.message}</p> : null}
                </div>
                <div>
                  <label className="text-sm font-semibold text-tic-navy" htmlFor="setup-confirm-password">Confirm password</label>
                  <Input id="setup-confirm-password" type="password" autoComplete="new-password" {...register("confirmPassword")} />
                  {errors.confirmPassword ? <p className="mt-1 text-xs text-tic-red">{errors.confirmPassword.message}</p> : null}
                </div>
              </div>

              {mutation.isError ? (
                <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                  {apiErrorMessage(mutation.error, "Could not complete account setup. Request a new link and try again.")}
                </div>
              ) : null}

              <Button className="mt-7 w-full" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : details.data?.profileRequired ? "Create account" : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
