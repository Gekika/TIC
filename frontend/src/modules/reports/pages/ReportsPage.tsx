import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, FileCheck2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { getWorkflowBoard } from "../../inspections/api/inspectionWorkflow.api";
import { GeneratedReportsPanel } from "../../inspections/pages/InspectionWorkflowPage";
import { useAuth } from "../../../shared/hooks/useAuth";
import { Input } from "../../../shared/ui/Input";

type ClosedReportAction = "archive" | "delete";
type ReportMode = "admin" | "farmer" | "supervisor" | "inspector";

function readClosedReportState() {
  const stored = window.localStorage.getItem("tic-closed-report-state");
  if (!stored) return {};
  try {
    return JSON.parse(stored) as Record<string, ClosedReportAction>;
  } catch {
    return {};
  }
}

export function ReportsPage() {
  const { user } = useAuth();
  const board = useQuery({ queryKey: ["inspection-workflow", "reports", user?.id], queryFn: getWorkflowBoard });
  const [search, setSearch] = useState("");
  const [classification, setClassification] = useState("ALL");
  const [closedReportState, setClosedReportState] = useState<Record<string, ClosedReportAction>>(readClosedReportState);
  const mode: ReportMode = user?.roles.some((role) => role === "SYSTEM_ADMIN" || role === "ORG_ADMIN")
    ? "admin"
    : user?.roles.includes("SUPERVISOR")
      ? "supervisor"
      : user?.roles.includes("INSPECTOR") ? "inspector" : "farmer";
  const completedReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (board.data?.requests ?? []).filter((request) => {
      if (request.status !== "COMPLETED" || closedReportState[request.id]) return false;
      if (classification !== "ALL" && request.classification !== classification) return false;
      if (!normalizedSearch) return true;
      return [request.farmName, request.clientName, request.organizationName, request.product, request.inspectorName, request.serviceRequest]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch));
    });
  }, [board.data?.requests, classification, closedReportState, search]);
  const updateClosedReportState = (requestId: string, action: ClosedReportAction) => {
    setClosedReportState((current) => {
      const next = { ...current, [requestId]: action };
      window.localStorage.setItem("tic-closed-report-state", JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-bold text-tic-navy">Completed Reports</h1>
          <p className="mt-2 text-sm text-tic-muted">Approved inspection reports available to your portal.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 border-l-2 border-tic-green pl-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-tic-muted">Available</p>
            <p className="mt-1 text-2xl font-bold text-tic-navy">{completedReports.length}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-tic-muted">All completed</p>
            <p className="mt-1 text-2xl font-bold text-tic-navy">{(board.data?.requests ?? []).filter((request) => request.status === "COMPLETED").length}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 border-b border-slate-200 pb-5 md:grid-cols-[minmax(0,1fr)_220px]" aria-label="Report filters">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-tic-muted" />
          <Input className="pl-9" placeholder="Search site, client, product, or inspector" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <select className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-tic-navy" value={classification} onChange={(event) => setClassification(event.target.value)} aria-label="Filter reports by classification">
          <option value="ALL">All classifications</option>
          <option value="ORIGIN">Origin</option>
          <option value="DESTINATION">Destination</option>
          <option value="DAMAGE">Damage</option>
        </select>
      </section>

      {board.isLoading ? (
        <div className="border border-slate-200 bg-white p-8 text-sm text-tic-muted">Loading completed reports...</div>
      ) : board.isError ? (
        <div className="border border-tic-red/20 bg-tic-red/10 p-4 text-sm text-tic-red" role="alert">Could not load completed reports. Refresh the page or sign in again.</div>
      ) : completedReports.length ? (
        <section className="space-y-4" aria-label="Completed inspection reports">
          {completedReports.map((request) => (
            <article key={request.id} className="overflow-hidden border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-tic-green/10 px-2.5 py-1 text-xs font-bold text-tic-green"><CheckCircle2 className="h-3.5 w-3.5" /> Completed</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-tic-muted">{request.classification}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-bold text-tic-navy">{request.farmName}</h2>
                  <p className="mt-1 text-sm text-tic-muted">{request.organizationName} · {request.clientName} · {request.product ?? "Product not provided"} · {request.preferredDate ?? "Date not set"}</p>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                  <div><dt className="text-xs font-bold uppercase tracking-wide text-tic-muted">Service</dt><dd className="mt-1 font-semibold text-tic-navy">{request.serviceRequest?.replace(/_/g, " ") ?? request.inspectionType}</dd></div>
                  <div><dt className="text-xs font-bold uppercase tracking-wide text-tic-muted">Inspector</dt><dd className="mt-1 font-semibold text-tic-navy">{request.inspectorName ?? "Not assigned"}</dd></div>
                  <div><dt className="text-xs font-bold uppercase tracking-wide text-tic-muted">Packaging</dt><dd className="mt-1 font-semibold text-tic-navy">{request.packagingType ?? "Not provided"}</dd></div>
                </dl>
              </div>
              <details className="border-t border-slate-200">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-bold text-tic-navy hover:bg-slate-50">
                  <span className="inline-flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-tic-green" /> View report and downloads</span>
                  <ClipboardList className="h-4 w-4 text-tic-muted" />
                </summary>
                <div className="border-t border-slate-200 p-4">
                  <GeneratedReportsPanel request={request} mode={mode} onClosedReportAction={updateClosedReportState} />
                </div>
              </details>
            </article>
          ))}
        </section>
      ) : (
        <div className="border border-slate-200 bg-white px-6 py-12 text-center">
          <FileCheck2 className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 text-lg font-bold text-tic-navy">No completed reports found</h2>
          <p className="mt-1 text-sm text-tic-muted">Completed and supervisor-approved inspections will appear here.</p>
        </div>
      )}
    </div>
  );
}
