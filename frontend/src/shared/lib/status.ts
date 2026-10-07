export function statusClassName(status: string) {
  const normalized = status.toUpperCase();
  if (["ACTIVE", "APPROVED", "COMPLETED", "PASS"].includes(normalized)) {
    return "bg-tic-green/10 text-tic-green";
  }
  if (["INVITED", "PENDING_REVIEW", "PENDING_ASSIGNMENT", "ASSIGNED", "IN_PROGRESS", "SUBMITTED"].includes(normalized)) {
    return "bg-tic-gold/10 text-tic-gold";
  }
  if (["REJECTED", "FAIL", "SUSPENDED", "CANCELLED"].includes(normalized)) {
    return "bg-tic-red/10 text-tic-red";
  }
  return "bg-slate-200 text-slate-700";
}
