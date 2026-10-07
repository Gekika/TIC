import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import type { ApiError } from "../../../shared/types/api.types";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { requestPasswordReset } from "../api/auth.api";

const schema = z.object({
  email: z.string().email("Enter a valid email address")
});

type ForgotPasswordValues = z.infer<typeof schema>;

function errorMessage(error: unknown) {
  return error instanceof AxiosError
    ? ((error.response?.data as ApiError | undefined)?.error?.message ?? "Could not request a reset link. Try again.")
    : "Could not request a reset link. Try again.";
}

export function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" }
  });
  const mutation = useMutation({
    mutationFn: (values: ForgotPasswordValues) => requestPasswordReset(values.email)
  });

  return (
    <main className="grid min-h-screen bg-tic-navy lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex items-center px-6 py-12 text-white lg:px-16">
        <div className="max-w-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-tic-green">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-8 text-4xl font-bold tracking-normal lg:text-5xl">Recover portal access</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
            Use the secure link sent to your account email to choose a new password.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-tic-surface px-6 py-12">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <KeyRound className="h-9 w-9 text-tic-green" aria-hidden="true" />
          <h2 className="mt-5 text-2xl font-bold text-tic-navy">Forgot password</h2>
          <p className="mt-2 text-sm leading-6 text-tic-muted">
            Enter the email address used for your TIC Operations account.
          </p>

          {mutation.isSuccess ? (
            <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800" role="status">
              {mutation.data.message}
            </div>
          ) : (
            <form className="mt-7 space-y-5" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
              <div>
                <label className="text-sm font-semibold text-tic-navy" htmlFor="recovery-email">Email</label>
                <Input id="recovery-email" type="email" autoComplete="email" {...register("email")} />
                {errors.email ? <p className="mt-1 text-xs text-tic-red">{errors.email.message}</p> : null}
              </div>
              {mutation.isError ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                  {errorMessage(mutation.error)}
                </div>
              ) : null}
              <Button className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          )}

          <Link className="mt-6 inline-flex text-sm font-semibold text-tic-green hover:underline" to="/login">
            Return to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
