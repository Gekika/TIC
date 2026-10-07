import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../../../shared/hooks/useAuth";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import type { ApiError } from "../../../shared/types/api.types";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type LoginValues = z.infer<typeof schema>;

export function LoginForm() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await login(values.email, values.password);
    } catch (caught) {
      const message = caught instanceof AxiosError
        ? (caught.response?.data as ApiError | undefined)?.error?.message
        : null;
      setError(message ?? "Login failed. Check the credentials and tenant seed data.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? (
        <div className="flex gap-2 rounded-md border border-tic-red/20 bg-tic-red/10 p-3 text-sm text-tic-red">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}
      <div>
        <label className="text-sm font-semibold text-tic-navy" htmlFor="email">
          Email
        </label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email ? <p className="mt-1 text-xs text-tic-red">{errors.email.message}</p> : null}
      </div>
      <div>
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-tic-navy" htmlFor="password">
            Password
          </label>
          <Link className="text-xs font-semibold text-tic-green hover:underline" to="/forgot-password">
            Forgot password?
          </Link>
        </div>
        <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
        {errors.password ? <p className="mt-1 text-xs text-tic-red">{errors.password.message}</p> : null}
      </div>
      <Button className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
