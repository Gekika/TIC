import { ShieldCheck } from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { LoginForm } from "../components/LoginForm";
import { useAuth } from "../../../shared/hooks/useAuth";

export function LoginPage() {
  const { user, landingPath } = useAuth();
  const [searchParams] = useSearchParams();
  if (user) {
    return <Navigate to={landingPath(user.roles)} replace />;
  }

  return (
    <main className="grid min-h-screen bg-tic-navy lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex items-center px-6 py-12 text-white lg:px-16">
        <div className="max-w-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-tic-green">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-8 text-4xl font-bold tracking-normal lg:text-6xl">TIC Operations Portal</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
            Inspection and certification workflows for producers, aggregators, processors, exporters, and importers.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center bg-tic-surface px-6 py-12">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-tic-navy">Sign in</h2>
          <p className="mt-2 text-sm text-tic-muted">Use your assigned TIC Operations account to continue.</p>
          {searchParams.get("reason") === "session-expired" ? (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="status">
              Your session expired. Sign in again, then resubmit the request.
            </div>
          ) : null}
          {searchParams.get("reason") === "account-ready" ? (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
              Your account is ready. Sign in with your new password.
            </div>
          ) : null}
          {searchParams.get("reason") === "license-inactive" ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
              Your organization&apos;s license is inactive. Contact your system administrator to restore portal access.
            </div>
          ) : null}
          <div className="mt-8">
            <LoginForm />
          </div>
          <p className="mt-6 text-center text-sm text-tic-muted">
            New inspection client?{" "}
            <Link to="/client/signup" className="font-semibold text-tic-green hover:underline">
              Create a client account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
