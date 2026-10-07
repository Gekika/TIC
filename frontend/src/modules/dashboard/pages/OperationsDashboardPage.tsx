import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  MapPinned,
  RefreshCcw,
  RotateCcw,
  ScrollText,
  Users,
  type LucideIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { getWorkflowBoard, type InspectionRequestRow } from "../../inspections/api/inspectionWorkflow.api";
import { useAuth } from "../../../shared/hooks/useAuth";

const statusLabels: Record<string, string> = {
  PENDING_REVIEW: "Pending assignment",
  PENDING_ASSIGNMENT: "Pending assignment",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Awaiting review",
  COMPLETED: "Completed",
  REJECTED: "Returned",
  CANCELLED: "Cancelled"
};

const statusStyles: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-50 text-amber-800",
  PENDING_ASSIGNMENT: "bg-amber-50 text-amber-800",
  ASSIGNED: "bg-sky-50 text-sky-800",
  IN_PROGRESS: "bg-blue-50 text-blue-800",
  SUBMITTED: "bg-violet-50 text-violet-800",
  COMPLETED: "bg-emerald-50 text-emerald-800",
  REJECTED: "bg-red-50 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-600"
};

const activeStatuses = new Set(["ASSIGNED", "IN_PROGRESS"]);
const openStatuses = new Set(["PENDING_REVIEW", "PENDING_ASSIGNMENT", "ASSIGNED", "IN_PROGRESS", "SUBMITTED", "REJECTED"]);

type DashboardMode = "operations" | "inspector";
type AttentionItem = { label: string; count: number; href: string; tone: "amber" | "red" | "blue" };
type MetricItem = { label: string; value: string | number; detail: string; icon: LucideIcon; tone: "amber" | "blue" | "red" | "green" };

export function OperationsDashboardPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const mode: DashboardMode = roles.some((role) => role === "SYSTEM_ADMIN" || role === "ORG_ADMIN" || role === "SUPERVISOR")
    ? "operations"
    : "inspector";
  const queuePath = mode === "inspector" ? "/inspector/jobs" : "/supervisor/queue";
  const board = useQuery({
    queryKey: ["inspection-workflow", "dashboard", user?.id],
    queryFn: getWorkflowBoard,
    refetchInterval: 30_000
  });
  const requests = board.data?.requests ?? [];
  const completed = requests.filter((request) => request.status === "COMPLETED").length;
  const returned = requests.filter((request) => request.status === "REJECTED").length;
  const closed = completed + returned;
  const completionRate = closed === 0 ? 0 : Math.round((completed / closed) * 100);
  const metrics = getMetrics(mode, requests, completionRate);
  const pipeline = getPipeline(mode, requests);
  const attention = getAttention(mode, requests, queuePath);
  const recent = [...requests]
    .sort((left, right) => dateTimeValue(right.updatedAt) - dateTimeValue(left.updatedAt))
    .slice(0, 6);
  const organizationNames = new Set(requests.map((request) => request.organizationName).filter(Boolean));
  const scopeLabel = roles.includes("SYSTEM_ADMIN")
    ? `${organizationNames.size} organization${organizationNames.size === 1 ? "" : "s"}`
    : requests[0]?.organizationName ?? "Your organization";

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-tic-navy">Dashboard</h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {mode === "inspector" ? "Inspector" : "Operations"}
            </span>
          </div>
          <p className="mt-2 text-sm text-tic-muted">
            {mode === "inspector"
              ? "Your assigned inspections, returned work, and completed reports."
              : `Inspection pipeline and review workload across ${scopeLabel}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void board.refetch()}
          disabled={board.isFetching}
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-tic-navy hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 sm:self-auto"
        >
          <RefreshCcw className={`h-4 w-4 ${board.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      {board.isError ? (
        <section className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>Dashboard data could not be loaded.</span>
          <button type="button" onClick={() => void board.refetch()} className="font-semibold underline">Try again</button>
        </section>
      ) : null}

      <section aria-label="Workflow metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {board.isLoading
          ? Array.from({ length: 4 }, (_, index) => <MetricSkeleton key={index} />)
          : metrics.map((metric) => <MetricCard key={metric.label} metric={metric} to={queuePath} />)}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-tic-navy">Inspection pipeline</h2>
              <p className="mt-1 text-sm text-tic-muted">Current requests grouped by workflow stage.</p>
            </div>
            <p className="text-right text-sm font-semibold text-tic-green">{requests.filter((request) => openStatuses.has(request.status)).length} open</p>
          </div>
          <PipelineChart groups={pipeline} />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-bold text-tic-navy">Needs attention</h2>
          </div>
          <div className="mt-4 space-y-3">
            {attention.length > 0 ? attention.map((item) => (
              <Link key={item.label} to={item.href} className="flex min-h-12 items-center justify-between gap-4 rounded-md border border-slate-200 px-3 py-2.5 hover:bg-slate-50">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${attentionDot(item.tone)}`} />
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                </div>
                <span className="text-lg font-bold text-tic-navy">{item.count}</span>
              </Link>
            )) : (
              <div className="flex min-h-36 flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-8 w-8 text-tic-green" />
                <p className="mt-3 text-sm font-semibold text-tic-navy">Nothing urgent</p>
                <p className="mt-1 text-xs text-tic-muted">Your workflow is currently within schedule.</p>
              </div>
            )}
          </div>
          <Link to={queuePath} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-tic-green hover:underline">
            Open {mode === "inspector" ? "my jobs" : "supervisor queue"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-tic-navy">Recent activity</h2>
            <p className="mt-1 text-sm text-tic-muted">Latest changes in your accessible inspection workflow.</p>
          </div>
          <Link to={queuePath} className="text-sm font-semibold text-tic-green hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-slate-100">
          {recent.length > 0 ? recent.map((request) => (
            <Link key={request.id} to={queuePath} className="grid min-h-16 gap-3 px-5 py-3 hover:bg-slate-50 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center">
              <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${statusStyles[request.status] ?? statusStyles.CANCELLED}`}>
                {statusLabels[request.status] ?? request.status}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-tic-navy">{activityTitle(request)}</p>
                <p className="mt-0.5 truncate text-xs text-tic-muted">
                  {request.farmName} · {request.clientName}{roles.includes("SYSTEM_ADMIN") ? ` · ${request.organizationName}` : ""}
                </p>
              </div>
              <span className="flex items-center gap-1 text-xs text-tic-muted">
                <Clock3 className="h-3.5 w-3.5" />
                {relativeTime(request.updatedAt)}
              </span>
            </Link>
          )) : (
            <div className="px-5 py-10 text-center text-sm text-tic-muted">No inspection activity yet.</div>
          )}
        </div>
      </section>

      <QuickActions mode={mode} isAdmin={roles.some((role) => role === "SYSTEM_ADMIN" || role === "ORG_ADMIN")} isSystemAdmin={roles.includes("SYSTEM_ADMIN")} />
    </div>
  );
}

function getMetrics(mode: DashboardMode, requests: InspectionRequestRow[], completionRate: number): MetricItem[] {
  if (mode === "inspector") {
    const completedThisMonth = requests.filter((request) => request.status === "COMPLETED" && isCurrentMonth(request.updatedAt)).length;
    return [
      { label: "Assigned", value: requests.filter((request) => request.status === "ASSIGNED").length, detail: "Ready to start", icon: ClipboardCheck, tone: "amber" },
      { label: "In progress", value: requests.filter((request) => request.status === "IN_PROGRESS").length, detail: "Drafts and field work", icon: Activity, tone: "blue" },
      { label: "Returned", value: requests.filter((request) => request.status === "REJECTED").length, detail: "Requires correction", icon: RotateCcw, tone: "red" },
      { label: "Completed", value: completedThisMonth, detail: "Approved this month", icon: FileCheck2, tone: "green" }
    ];
  }
  const awaitingAssignment = requests.filter((request) => ["PENDING_REVIEW", "PENDING_ASSIGNMENT"].includes(request.status)).length;
  const active = requests.filter((request) => activeStatuses.has(request.status)).length;
  const awaitingReview = requests.filter((request) => request.status === "SUBMITTED").length;
  return [
    { label: "Pending assignment", value: awaitingAssignment, detail: "New service requests", icon: Clock3, tone: "amber" },
    { label: "Active inspections", value: active, detail: "Assigned and in progress", icon: ClipboardCheck, tone: "blue" },
    { label: "Reports to review", value: awaitingReview, detail: "Submitted by inspectors", icon: AlertTriangle, tone: "red" },
    { label: "Approval rate", value: `${completionRate}%`, detail: "Approved vs returned reports", icon: CheckCircle2, tone: "green" }
  ];
}

function getPipeline(mode: DashboardMode, requests: InspectionRequestRow[]) {
  const allGroups = [
    { label: "New", statuses: ["PENDING_REVIEW", "PENDING_ASSIGNMENT"], color: "bg-amber-400" },
    { label: "Assigned", statuses: ["ASSIGNED"], color: "bg-sky-500" },
    { label: "In progress", statuses: ["IN_PROGRESS"], color: "bg-blue-700" },
    { label: "In review", statuses: ["SUBMITTED"], color: "bg-violet-500" },
    { label: "Completed", statuses: ["COMPLETED"], color: "bg-emerald-600" },
    { label: "Returned", statuses: ["REJECTED"], color: "bg-red-500" }
  ];
  return (mode === "inspector" ? allGroups.slice(1) : allGroups).map((group) => ({
    ...group,
    count: requests.filter((request) => group.statuses.includes(request.status)).length
  }));
}

function getAttention(mode: DashboardMode, requests: InspectionRequestRow[], queuePath: string): AttentionItem[] {
  const now = Date.now();
  const scheduledStatuses = mode === "inspector"
    ? new Set(["ASSIGNED", "IN_PROGRESS"])
    : new Set(["PENDING_REVIEW", "PENDING_ASSIGNMENT", "ASSIGNED", "IN_PROGRESS"]);
  const overdue = requests.filter((request) => scheduledStatuses.has(request.status) && isPastDate(request.preferredDate)).length;
  if (mode === "inspector") {
    const returned = requests.filter((request) => request.status === "REJECTED").length;
    const dueSoon = requests.filter((request) => activeStatuses.has(request.status) && isWithinDays(request.preferredDate, 2)).length;
    return [
      { label: "Overdue inspections", count: overdue, href: queuePath, tone: "red" as const },
      { label: "Reports returned for correction", count: returned, href: queuePath, tone: "amber" as const },
      { label: "Inspections due within 2 days", count: dueSoon, href: queuePath, tone: "blue" as const }
    ].filter((item) => item.count > 0);
  }
  const unassignedOver48Hours = requests.filter((request) => {
    const createdAt = dateTimeValue(request.createdAt);
    return ["PENDING_REVIEW", "PENDING_ASSIGNMENT"].includes(request.status) && createdAt > 0 && now - createdAt > 48 * 60 * 60 * 1000;
  }).length;
  const reviewsOver48Hours = requests.filter((request) => {
    const updatedAt = dateTimeValue(request.updatedAt);
    return request.status === "SUBMITTED" && updatedAt > 0 && now - updatedAt > 48 * 60 * 60 * 1000;
  }).length;
  return [
    { label: "Requests unassigned for over 48 hours", count: unassignedOver48Hours, href: queuePath, tone: "amber" as const },
    { label: "Reports awaiting review over 48 hours", count: reviewsOver48Hours, href: queuePath, tone: "red" as const },
    { label: "Inspections past their scheduled date", count: overdue, href: queuePath, tone: "blue" as const }
  ].filter((item) => item.count > 0);
}

function MetricCard({ metric, to }: { metric: MetricItem; to: string }) {
  const tone = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-sky-50 text-sky-700",
    red: "bg-red-50 text-red-700",
    green: "bg-emerald-50 text-emerald-700"
  }[metric.tone];
  return (
    <Link to={to} className="group min-h-32 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow active:scale-[0.99]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-tic-muted">{metric.label}</p>
          <p className="mt-3 text-3xl font-bold text-tic-navy">{metric.value}</p>
          <p className="mt-1 text-xs text-tic-muted">{metric.detail}</p>
        </div>
        <span className={`rounded-md p-2.5 ${tone}`}><metric.icon className="h-5 w-5" /></span>
      </div>
    </Link>
  );
}

function MetricSkeleton() {
  return <div className="min-h-32 animate-pulse rounded-lg border border-slate-200 bg-white p-5"><div className="h-3 w-28 rounded bg-slate-200" /><div className="mt-5 h-8 w-16 rounded bg-slate-200" /><div className="mt-3 h-3 w-36 rounded bg-slate-100" /></div>;
}

function PipelineChart({ groups }: { groups: Array<{ label: string; count: number; color: string }> }) {
  const maximum = Math.max(1, ...groups.map((group) => group.count));
  return (
    <div className="mt-6 grid h-96 grid-cols-3 gap-3 sm:h-52 sm:grid-cols-6 sm:gap-5">
      {groups.map((group) => {
        const height = group.count === 0 ? 6 : Math.max(16, Math.round((group.count / maximum) * 132));
        return (
          <div key={group.label} className="flex min-w-0 flex-col items-center justify-end">
            <span className="mb-2 text-lg font-bold text-tic-navy">{group.count}</span>
            <div className="flex h-32 w-full max-w-20 items-end overflow-hidden rounded-sm bg-slate-100">
              <div className={`w-full rounded-sm ${group.color} transition-all duration-500`} style={{ height }} />
            </div>
            <span className="mt-2 w-full truncate text-center text-[11px] font-semibold text-tic-muted" title={group.label}>{group.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function QuickActions({ mode, isAdmin, isSystemAdmin }: { mode: DashboardMode; isAdmin: boolean; isSystemAdmin: boolean }) {
  const actions = mode === "inspector"
    ? [
        { label: "Open assigned jobs", to: "/inspector/jobs", icon: ClipboardCheck },
        { label: "View completed reports", to: "/reports", icon: FileText },
        { label: "Open client and site registry", to: "/farmers", icon: MapPinned }
      ]
    : [
        { label: "Open supervisor queue", to: "/supervisor/queue", icon: ClipboardCheck },
        { label: "View completed reports", to: "/reports", icon: FileText },
        { label: "Open client and site registry", to: "/farmers", icon: MapPinned },
        ...(isAdmin ? [{ label: "Manage users", to: "/users", icon: Users }, { label: "Manage form templates", to: "/forms", icon: ScrollText }] : []),
        ...(isSystemAdmin ? [{ label: "Manage organizations", to: "/organizations", icon: Building2 }] : [])
      ];
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-tic-navy">Quick actions</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((action) => (
          <Link key={action.to} to={action.to} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:border-tic-green hover:bg-emerald-50 hover:text-tic-green active:scale-[0.98]">
            <action.icon className="h-4 w-4" />
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function activityTitle(request: InspectionRequestRow) {
  const prefix: Record<string, string> = {
    PENDING_REVIEW: "Service request submitted",
    PENDING_ASSIGNMENT: "Request ready for assignment",
    ASSIGNED: "Inspection assigned",
    IN_PROGRESS: "Inspection work updated",
    SUBMITTED: "Inspection submitted for review",
    COMPLETED: "Report approved",
    REJECTED: "Report returned to inspector",
    CANCELLED: "Request cancelled"
  };
  return `${prefix[request.status] ?? "Inspection updated"} · ${request.product ?? request.serviceRequest ?? "General inspection"}`;
}

function relativeTime(value: string | null | undefined) {
  const timestamp = dateTimeValue(value);
  if (timestamp === 0) return "Recently";
  const difference = timestamp - Date.now();
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minutes = Math.round(difference / 60_000);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return formatter.format(days, "day");
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(timestamp));
}

function isPastDate(value: string | null) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${value}T00:00:00`).getTime() < today.getTime();
}

function isWithinDays(value: string | null, days: number) {
  if (!value) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(`${value}T00:00:00`).getTime();
  return target >= start.getTime() && target <= start.getTime() + days * 24 * 60 * 60 * 1000;
}

function isCurrentMonth(value: string | null | undefined) {
  const timestamp = dateTimeValue(value);
  if (timestamp === 0) return false;
  const date = new Date(timestamp);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function attentionDot(tone: AttentionItem["tone"]) {
  return { amber: "bg-amber-500", red: "bg-red-500", blue: "bg-sky-500" }[tone];
}

function dateTimeValue(value: string | null | undefined) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
