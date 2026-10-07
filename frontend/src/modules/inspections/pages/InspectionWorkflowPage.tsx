import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { CheckCircle2, ClipboardList, Image, MapPin, Pencil, Play, Plus, Send, Trash2, UserCheck, X } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  assignInspector,
  createFarm,
  createInspectionRequest,
  getWorkflowBoard,
  reviewInspection,
  saveInspectionDraft,
  startInspection,
  submitInspectionWithNotes,
  updateClientRequest,
  type InspectionRequestRow,
  type UpdateClientRequestPayload
} from "../api/inspectionWorkflow.api";
import {
  ActualInspectionForm,
  CropManualPanel,
  collectActualInspectionPhotos,
  createEmptyActualInspectionCapture,
  isActualInspectionCapture,
  validateActualInspectionCapture,
  type ActualInspectionCapture,
  type InspectionPhoto
} from "../components/ActualInspectionForm";
import { statusClassName } from "../../../shared/lib/status";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { useAuth } from "../../../shared/hooks/useAuth";
import type { ApiError } from "../../../shared/types/api.types";

type WorkflowMode = "admin" | "farmer" | "supervisor" | "inspector";

type InspectionWorkflowPageProps = {
  mode: WorkflowMode;
};

type RequestFilter = "PENDING" | "APPROVED" | "REJECTED";
type ReportAudience = "supervisor" | "inspector" | "farmer";
type ChecklistAnswer = {
  value: string;
  checked: boolean;
};
type ExtraField = {
  id: string;
  label: string;
  value: string;
};
type WorksheetSampleRow = Record<string, string>;
type WorksheetColumn = {
  key: string;
  label: string;
  inputType?: "text" | "number" | "select" | "date";
  options?: string[];
  custom?: boolean;
};
type WorksheetGroup = {
  id: string;
  label: string;
  columns: WorksheetColumn[];
};
type InspectionDraft = {
  inspectorNotes: string;
  checklistAnswers: Record<string, ChecklistAnswer>;
  extraFields: ExtraField[];
  photoNames: string[];
  fieldLatitude: string;
  fieldLongitude: string;
  worksheetHeader: Record<string, string>;
  sampleRows: WorksheetSampleRow[];
  customWorksheetColumns: Record<string, WorksheetColumn[]>;
  actualInspection: ActualInspectionCapture;
};
type PhotoEvidence = {
  id: string;
  name: string;
  url: string;
  dataUrl: string;
  description: string;
};
type ClosedReportAction = "archive" | "delete";
type ReleasedReportConfig = {
  sections: ClosedReportSections;
  publishedAt: string;
};
const countyOptions: Record<string, string[]> = {
  Nairobi: ["Westlands", "Dagoretti North", "Langata", "Embakasi East"],
  Kiambu: ["Kikuyu", "Kiambu Town", "Limuru", "Thika Town"],
  Nakuru: ["Nakuru Town East", "Nakuru Town West", "Naivasha", "Gilgil"],
  Machakos: ["Athi River", "Machakos Town", "Kangundo", "Mwala"],
  Meru: ["Imenti North", "Imenti South", "Tigania West", "Buuri"],
  "Murang'a": ["Kangema", "Maragua", "Kiharu", "Gatanga"],
  Kisumu: ["Kisumu Central", "Nyando", "Muhoroni", "Seme"],
  "Uasin Gishu": ["Soy", "Turbo", "Ainabkoi", "Kapseret"],
  Mombasa: ["Mvita", "Kisauni", "Likoni", "Changamwe"]
};

const productOptions = ["Avocado", "Apple", "Asparagus", "Mango", "Citrus", "Other"];
const productSpecializations: Record<string, string[]> = {
  Avocado: ["Hass", "Fuerte", "Pinkerton", "Reed", "Lamb Hass", "Bacon"],
  Apple: ["Gala", "Fuji", "Honeycrisp", "Cosmic Crisp", "Red Delicious"]
};
const serviceOptions = [
  { value: "FIELD_ORCHARD", label: "Field / Orchard", designation: "FARMER_PRODUCER" },
  { value: "PSI", label: "Pre-shipment Inspection (PSI)", designation: "AGGREGATOR" },
  { value: "QUALITY_ASSURANCE", label: "Quality Assurance", designation: "PROCESSOR" },
  { value: "QUALITY_ASSESSMENT", label: "Quality Assessment", designation: "EXPORTER" },
  { value: "DESTINATION_INSPECTION", label: "Inspection at Destination", designation: "IMPORTER" }
];
const packagingOptions = ["4KG Carton Crate", "4KG Plastic Crate", "10KG Carton Crate", "10KG Plastic Crate"];
const optionalRequirementOptions = [
  "HCD Inspection Report (Dry Matter)",
  "Phytosanitary Certificate",
  "Sustainability",
  "Certification Standards",
  "Organic Standards",
  "Conventional Standards"
];

const dummyChecklist = [
  { sectionTitle: "Site Verification", questionText: "Confirm the client site, inspection unit, and GPS coordinates.", questionType: "CHECKBOX", required: true, critical: true },
  { sectionTitle: "Commodity", questionText: "Confirm commodity variety, maturity stage, and visible quality condition.", questionType: "TEXT", required: true, critical: false },
  { sectionTitle: "Field Inspection", questionText: "Record pest, disease, hygiene, irrigation, and handling observations.", questionType: "TEXTAREA", required: true, critical: true },
  { sectionTitle: "Evidence", questionText: "Capture supporting photos, exceptions, and corrective action notes.", questionType: "TEXTAREA", required: false, critical: false }
];

const avocadoHeaderFields = [
  "Client",
  "Location",
  "Packaging",
  "Container / AWB",
  "Exporter",
  "N° Boxes",
  "Conveyance",
  "Warehouse",
  "Arrival date",
  "Ship / Vessel",
  "Commodity",
  "Inspection Date",
  "Fruit Type",
  "Receiver",
  "Atmosphere type",
  "Country of Origin",
  "Pallet Quantity",
  "Fumigated"
];

const avocadoWorksheetGroups: WorksheetGroup[] = [
  {
    id: "information",
    label: "Information",
    columns: [
      { key: "sampleNumber", label: "Sample No.", inputType: "number" },
      { key: "count", label: "Count", inputType: "number" },
      { key: "sampleCases", label: "Sample Cases", inputType: "number" },
      { key: "casesPallet", label: "Cases Pallet", inputType: "number" },
      { key: "package", label: "Package" },
      { key: "grower", label: "Grower" },
      { key: "variety", label: "Variety" },
      { key: "packingDate", label: "Packing Date", inputType: "date" },
      { key: "palletNumber", label: "Pallet Number", inputType: "number" },
      { key: "labelBrand", label: "Label / Brand" }
    ]
  },
  {
    id: "measurements",
    label: "Measurements",
    columns: [
      { key: "size", label: "Size", inputType: "number" },
      { key: "firmnessMax", label: "Firmness Max (Kg)" },
      { key: "firmnessMin", label: "Firmness Min (Kg)" },
      { key: "netWeight", label: "Net Weight (Kg)", inputType: "number" },
      { key: "temperature", label: "Temperature (°C)", inputType: "number" },
      { key: "co2", label: "CO2%" },
      { key: "o2", label: "O2%" }
    ]
  },
  {
    id: "package",
    label: "Package",
    columns: [
      { key: "labelWeight", label: "Label Weight" },
      { key: "traceability", label: "Traceability", inputType: "select", options: ["N/A", "Pass", "Fail"] },
      { key: "wrongPackage", label: "Wrong Package", inputType: "number" },
      { key: "wrongLabel", label: "Wrong Label / Variety", inputType: "number" },
      { key: "qcPackage", label: "QC Package", inputType: "select", options: ["Good", "Minor", "Major", "Reject"] },
      { key: "pluPercent", label: "PLU (%)" },
      { key: "pluNumber", label: "PLU Number" }
    ]
  },
  {
    id: "quality",
    label: "Quality Defects",
    columns: [
      { key: "generalAppearance", label: "General Appearance", inputType: "select", options: ["Good", "Fair", "Poor"] },
      { key: "colorTurning", label: "Color Turning", inputType: "number" },
      { key: "colorBlack", label: "Color Black", inputType: "number" },
      { key: "foreignMaterial", label: "Foreign Material / Dirty", inputType: "number" },
      { key: "misshape", label: "Misshape", inputType: "number" },
      { key: "scarsSevere", label: "Scars Severe", inputType: "number" },
      { key: "scarsModerate", label: "Scars Slight / Moderate", inputType: "number" },
      { key: "skinAbrasion", label: "Skin Abrasions", inputType: "number" },
      { key: "sunBurn", label: "Sun Burn", inputType: "number" },
      { key: "longStalk", label: "Long Stalk", inputType: "number" }
    ]
  },
  {
    id: "condition",
    label: "Condition Defects",
    columns: [
      { key: "decay", label: "Decay", inputType: "number" },
      { key: "stemEndRot", label: "Stem End Rot", inputType: "number" },
      { key: "mold", label: "Mold", inputType: "number" },
      { key: "openWounds", label: "Open Wounds", inputType: "number" },
      { key: "internalBreakdown", label: "Internal Breakdown", inputType: "number" },
      { key: "bruises", label: "Bruises", inputType: "number" },
      { key: "chillingDamage", label: "Chilling / Freezing Damage", inputType: "number" },
      { key: "anthracnoseSevere", label: "Anthracnose Severe", inputType: "number" },
      { key: "anthracnoseModerate", label: "Anthracnose Slight / Mod.", inputType: "number" },
      { key: "softFruit", label: "Soft Fruit / Overripe", inputType: "number" },
      { key: "pestDamage", label: "Insect / Pest Damage", inputType: "number" },
      { key: "blackSpot", label: "Black Spot", inputType: "number" }
    ]
  },
  {
    id: "score",
    label: "Score",
    columns: [
      { key: "qcQuality", label: "QC Quality", inputType: "number" },
      { key: "qcCondition", label: "QC Condition", inputType: "number" },
      { key: "finalScore", label: "Final Score", inputType: "number" },
      { key: "sampleDecision", label: "Sample Decision", inputType: "select", options: ["Pass", "Hold", "Reject"] }
    ]
  }
];

const defaultHeaderValues: Record<string, string> = {};

function createDefaultSample(index: number): WorksheetSampleRow {
  return {
    sampleNumber: String(index),
    count: "",
    sampleCases: "",
    casesPallet: "",
    package: "",
    grower: "",
    variety: "",
    packingDate: "",
    palletNumber: String(index),
    labelBrand: "",
    size: "",
    firmnessMax: "",
    firmnessMin: "",
    netWeight: "",
    temperature: "",
    co2: "",
    o2: "",
    labelWeight: "",
    traceability: "",
    wrongPackage: "",
    wrongLabel: "",
    qcPackage: "",
    generalAppearance: "",
    sampleDecision: ""
  };
}

function designationLabel(value: string) {
  const labels: Record<string, string> = {
    FARMER_PRODUCER: "Farmer / Producer",
    AGGREGATOR: "Aggregator",
    PROCESSOR: "Processor",
    EXPORTER: "Exporter",
    IMPORTER: "Importer"
  };
  return labels[value] ?? value.replace(/_/g, " ");
}

function codeLabel(value: string | null | undefined) {
  if (!value) return "Not provided";
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function LabeledControl({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wide text-tic-muted">
      {label}
      <span className="mt-1 block normal-case tracking-normal text-tic-navy">{children}</span>
    </label>
  );
}

function worksheetHeaderFromRequest(request: InspectionRequestRow) {
  return {
    ...defaultHeaderValues,
    Client: request.clientName,
    Location: [request.siteCounty, request.siteSubCounty].filter(Boolean).join(", "),
    Packaging: request.packagingType ?? "",
    Warehouse: request.farmName,
    Commodity: [request.product, request.productSpecializations.join(", ")].filter(Boolean).join(" - "),
    "Inspection Date": request.preferredDate ?? "",
    "Fruit Type": request.optionalRequirements.includes("Organic Standards") ? "ORGANIC" : "",
    Receiver: request.consignee ?? "",
    "Atmosphere type": codeLabel(request.atmosphereType),
    "Pallet Quantity": String(request.palletCount ?? "")
  };
}

function sampleRowsFromRequest(request: InspectionRequestRow) {
  return [1, 2, 3].map((index) => ({
    ...createDefaultSample(index),
    package: request.packagingType ?? "",
    grower: request.clientName,
    variety: request.productSpecializations[0] ?? request.product ?? "",
    casesPallet: String(request.unitsPerPallet ?? "")
  }));
}

export function InspectionWorkflowPage({ mode }: InspectionWorkflowPageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const workflowQueryKey = ["inspection-workflow", mode, user?.id] as const;
  const board = useQuery({ queryKey: workflowQueryKey, queryFn: getWorkflowBoard });
  const [classification, setClassification] = useState<"ORIGIN" | "DESTINATION" | "DAMAGE">("ORIGIN");
  const [selectedInspector, setSelectedInspector] = useState("");
  const [selectedFarm, setSelectedFarm] = useState("");
  const [newFarmName, setNewFarmName] = useState("");
  const [newFarmCounty, setNewFarmCounty] = useState("");
  const [newFarmSubCounty, setNewFarmSubCounty] = useState("");
  const [newFarmCrop, setNewFarmCrop] = useState("");
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [serviceRequest, setServiceRequest] = useState("");
  const [packagingType, setPackagingType] = useState("");
  const [atmosphereType, setAtmosphereType] = useState("");
  const [inspectionUnit, setInspectionUnit] = useState("");
  const [unitsPerPallet, setUnitsPerPallet] = useState("");
  const [palletCount, setPalletCount] = useState("");
  const [consignee, setConsignee] = useState("");
  const [optionalRequirements, setOptionalRequirements] = useState<string[]>([]);
  const [farmLatitude, setFarmLatitude] = useState("");
  const [farmLongitude, setFarmLongitude] = useState("");
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [workflowSuccess, setWorkflowSuccess] = useState<string | null>(null);
  const [preferredDate, setPreferredDate] = useState("");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [requestFilter, setRequestFilter] = useState<RequestFilter>("PENDING");
  const [closedReportState, setClosedReportState] = useState<Record<string, ClosedReportAction>>(() => {
    const stored = window.localStorage.getItem("tic-closed-report-state");
    return stored ? (JSON.parse(stored) as Record<string, ClosedReportAction>) : {};
  });

  const invalidate = async () => queryClient.invalidateQueries({ queryKey: ["inspection-workflow"] });
  const createFarmMutation = useMutation({
    mutationFn: createFarm,
    onSuccess: async () => {
      await invalidate();
      setWorkflowSuccess("Farm details saved successfully.");
    }
  });
  const createMutation = useMutation({
    mutationFn: createInspectionRequest,
    onSuccess: async () => {
      await invalidate();
      setWorkflowSuccess("Inspection request submitted successfully. It is now pending supervisor review.");
    },
    onError: (caught) => {
      setWorkflowSuccess(null);
      setWorkflowError(apiMessage(caught) ?? "Could not create inspection request.");
    }
  });
  const assignMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => assignInspector(id, { inspectorId: selectedInspector, scheduledDate }),
    onSuccess: async () => {
      setWorkflowError(null);
      await invalidate();
      setWorkflowSuccess("Inspector assigned successfully. The job is now visible in the inspector portal.");
    },
    onError: (caught) => setWorkflowError(apiMessage(caught) ?? "Could not assign the inspector.")
  });
  const updateClientRequestMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateClientRequestPayload }) => updateClientRequest(id, payload),
    onSuccess: async () => {
      setWorkflowError(null);
      await invalidate();
      setWorkflowSuccess("Client request and site details updated successfully.");
    },
    onError: (caught) => {
      const message = apiMessage(caught) ?? "Could not update the client request.";
      setWorkflowError(message);
    }
  });
  const startMutation = useMutation({
    mutationFn: startInspection,
    onSuccess: async () => {
      setWorkflowError(null);
      await invalidate();
      setWorkflowSuccess("Inspection started. The inspection form is now open for capture.");
    },
    onError: (caught) => setWorkflowError(apiMessage(caught) ?? "Could not start the inspection. Refresh the page and try again.")
  });
  const submitMutation = useMutation({
    mutationFn: ({ id, notes, captureData }: { id: string; notes: string; captureData: ActualInspectionCapture }) => submitInspectionWithNotes(id, notes, captureData),
    onSuccess: async (_data, variables) => {
      setWorkflowError(null);
      window.localStorage.removeItem(`tic-inspection-draft-${variables.id}`);
      await invalidate();
      setWorkflowSuccess("Inspection form submitted successfully. It is now pending supervisor report review.");
    },
    onError: (caught) => setWorkflowError(apiMessage(caught) ?? "Could not submit the inspection form.")
  });
  const draftMutation = useMutation({
    mutationFn: ({ id, notes, captureData }: { id: string; notes: string; captureData: ActualInspectionCapture }) => saveInspectionDraft(id, { moreInfo: notes, captureData }),
    onSuccess: () => {
      setWorkflowError(null);
      setWorkflowSuccess("Inspection draft saved securely.");
    },
    onError: (caught) => setWorkflowError(apiMessage(caught) ?? "Could not save the inspection draft.")
  });
  const approveMutation = useMutation({
    mutationFn: ({ id, editedReport }: { id: string; editedReport: string }) => reviewInspection(id, { decision: "APPROVED", comments: "Approved from supervisor queue", editedReport }),
    onSuccess: async (_data, variables) => {
      setWorkflowError(null);
      window.localStorage.removeItem(`tic-supervisor-review-draft-${variables.id}`);
      await invalidate();
      setWorkflowSuccess("Report approved successfully. The supervisor can now publish role-specific final reports.");
    },
    onError: (caught) => setWorkflowError(apiMessage(caught) ?? "Could not approve the report.")
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, editedReport, reason }: { id: string; editedReport: string; reason: string }) => reviewInspection(id, { decision: "REJECTED", comments: reason, editedReport }),
    onSuccess: async (_data, variables) => {
      setWorkflowError(null);
      window.localStorage.removeItem(`tic-supervisor-review-draft-${variables.id}`);
      await invalidate();
      setWorkflowSuccess("Report rejected and returned for follow-up.");
    },
    onError: (caught) => setWorkflowError(apiMessage(caught) ?? "Could not reject the report.")
  });

  const requests = board.data?.requests ?? [];
  const farms = board.data?.farms ?? [];
  const selectedFarmName = farms.find((farm) => farm.id === selectedFarm)?.label.split(" (")[0] ?? newFarmName.trim();
  const hasVolumeInputs = unitsPerPallet.trim() !== "" && palletCount.trim() !== "";
  const totalUnits = Math.max(0, Number(unitsPerPallet) || 0) * Math.max(0, Number(palletCount) || 0);
  const packageWeightKg = packagingType.startsWith("10KG") ? 10 : 4;
  const totalWeightKg = totalUnits * packageWeightKg;
  const activeRequestExists = requests.some(
    (item) => item.status !== "COMPLETED" && item.status !== "CANCELLED"
      && item.farmName.toLowerCase() === selectedFarmName.toLowerCase()
      && item.serviceRequest === serviceRequest
      && item.preferredDate === preferredDate
  );
  const isSubmittingRequest = createMutation.isPending || createFarmMutation.isPending;
  const filteredRequests = requests.filter((request) => {
    if (closedReportState[request.id]) return false;
    if (requestFilter === "APPROVED") return request.status === "COMPLETED";
    if (requestFilter === "REJECTED") return request.status === "REJECTED";
    return !["COMPLETED", "REJECTED", "CANCELLED"].includes(request.status);
  });
  const updateClosedReportState = (requestId: string, action: ClosedReportAction) => {
    setClosedReportState((current) => {
      const next = { ...current, [requestId]: action };
      window.localStorage.setItem("tic-closed-report-state", JSON.stringify(next));
      return next;
    });
  };
  const title = useMemo(() => {
    if (mode === "farmer") return "Client Dashboard";
    if (mode === "supervisor") return "Supervisor Queue";
    if (mode === "inspector") return "Inspector Jobs";
    return "Inspection Operations";
  }, [mode]);

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-3xl font-bold text-tic-navy">{title}</h1>
          <p className="mt-2 text-sm text-tic-muted">
            Client to Supervisor to Inspector workflow for service requests, field capture, review, and final reporting.
          </p>
        </div>
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-4">
          <Metric label="Pending Review" value={requests.filter((item) => item.status === "PENDING_REVIEW").length} />
          <Metric label="Assigned" value={requests.filter((item) => item.status === "ASSIGNED").length} />
          <Metric label="In Progress" value={requests.filter((item) => item.status === "IN_PROGRESS").length} />
          <Metric label="Completed" value={requests.filter((item) => item.status === "COMPLETED").length} />
        </div>
      </section>

      {workflowSuccess ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-tic-green/20 bg-tic-green/10 p-4 text-sm text-tic-green" role="status" aria-live="polite">
          <span>{workflowSuccess}</span>
          <button type="button" className="font-bold" onClick={() => setWorkflowSuccess(null)} aria-label="Dismiss confirmation">Dismiss</button>
        </div>
      ) : null}
      {workflowError && mode !== "farmer" ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-tic-red/20 bg-tic-red/10 p-4 text-sm text-tic-red" role="alert">
          <span>{workflowError}</span>
          <button type="button" className="font-bold" onClick={() => setWorkflowError(null)} aria-label="Dismiss error">Dismiss</button>
        </div>
      ) : null}

      {mode === "farmer" && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-200 pb-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-lg font-bold text-tic-navy">Create service request</h2>
              <p className="mt-1 text-sm text-tic-muted">Provide the site, product, shipment, and optional compliance requirements for supervisor review.</p>
            </div>
            {board.data?.clientProfile ? (
              <div className="text-sm md:text-right">
                <p className="font-semibold text-tic-navy">{board.data.clientProfile.clientName}</p>
                <p className="text-tic-muted">{designationLabel(board.data.clientProfile.designation)}</p>
              </div>
            ) : null}
          </div>
          {workflowError ? <div className="mt-4 rounded-md border border-tic-red/20 bg-tic-red/10 p-3 text-sm text-tic-red">{workflowError}</div> : null}
          <form
            className="mt-5 space-y-6"
            onSubmit={async (event) => {
              event.preventDefault();
              setWorkflowError(null);
              setWorkflowSuccess(null);
              if (!serviceRequest) {
                setWorkflowError("Select a service request.");
                return;
              }
              if (!inspectionUnit) {
                setWorkflowError("Select an inspection unit.");
                return;
              }
              if (!selectedFarm && !newFarmName.trim()) {
                setWorkflowError("Select an existing site or enter a processing unit, warehouse, or orchard name.");
                return;
              }
              if (!selectedFarm && (!newFarmCounty || !newFarmSubCounty)) {
                setWorkflowError("Select the site county and sub-county.");
                return;
              }
              if (!selectedFarm && (!farmLatitude || !farmLongitude)) {
                setWorkflowError("Capture or enter the site GPS coordinates before submitting.");
                return;
              }
              if (!newFarmCrop || !packagingType || !atmosphereType) {
                setWorkflowError("Select the product, packaging, and atmosphere type.");
                return;
              }
              if (!consignee.trim()) {
                setWorkflowError("Enter the consignee or receiver name.");
                return;
              }
              if (!preferredDate) {
                setWorkflowError("Select an inspection date.");
                return;
              }
              if ((productSpecializations[newFarmCrop]?.length ?? 0) > 0 && !selectedSpecializations.length) {
                setWorkflowError(`Select at least one ${newFarmCrop} specialization.`);
                return;
              }
              if (totalUnits <= 0) {
                setWorkflowError("Crates per pallet and number of pallets must be greater than zero.");
                return;
              }
              if (activeRequestExists) return;
              const latitude = Number(farmLatitude);
              const longitude = Number(farmLongitude);
              if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
                setWorkflowError("GPS coordinates must be valid decimal numbers.");
                return;
              }

              try {
                const farmId = selectedFarm || (await createFarmMutation.mutateAsync({
                  name: newFarmName,
                  county: newFarmCounty,
                  subCounty: newFarmSubCounty,
                  ward: "",
                  sizeAcres: 1,
                  primaryCrop: newFarmCrop,
                  latitude,
                  longitude,
                  siteType: inspectionUnit
                })).id;
                const serviceLabel = serviceOptions.find((item) => item.value === serviceRequest)?.label ?? serviceRequest;
                await createMutation.mutateAsync({
                  farmId,
                  inspectionType: serviceLabel,
                  classification,
                  preferredDate,
                  serviceRequest,
                  product: newFarmCrop,
                  productSpecializations: selectedSpecializations,
                  packagingType,
                  atmosphereType,
                  inspectionUnit,
                  unitsPerPallet: Number(unitsPerPallet),
                  palletCount: Number(palletCount),
                  totalUnits,
                  totalWeightKg,
                  consignee: consignee.trim(),
                  optionalRequirements,
                  notes: `Client service request for ${serviceLabel} at ${newFarmCounty}, ${newFarmSubCounty}.`
                });
              } catch (caught) {
                setWorkflowError(apiMessage(caught) ?? "Could not submit the client service request.");
              }
            }}
          >
            <fieldset>
              <legend className="text-sm font-bold text-tic-navy">Service and site details</legend>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <LabeledControl label="Service request">
                  <select
                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={serviceRequest}
                    onChange={(event) => {
                      const service = event.target.value;
                      setServiceRequest(service);
                      setClassification(service === "DESTINATION_INSPECTION" ? "DESTINATION" : "ORIGIN");
                    }}
                  >
                    <option value="">Select service request</option>
                    {serviceOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </LabeledControl>
                <LabeledControl label="Saved site (optional)">
                  <select className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={selectedFarm} onChange={(event) => setSelectedFarm(event.target.value)}>
                    <option value="">Enter a new site</option>
                    {farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.label}</option>)}
                  </select>
                </LabeledControl>
                <LabeledControl label="Inspection unit">
                  <select className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={inspectionUnit} onChange={(event) => setInspectionUnit(event.target.value)}>
                    <option value="">Select inspection unit</option>
                    <option value="COLD_ROOM">Cold room / Warehouse</option>
                    <option value="REEFER_UNIT">Reefer unit / Refrigerated lorry</option>
                    <option value="ORCHARD">Orchard / Field</option>
                  </select>
                </LabeledControl>
                {selectedFarm ? (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 md:col-span-2 xl:col-span-3">
                    The registered location and GPS for <strong>{selectedFarmName}</strong> will be used for this request.
                  </div>
                ) : (
                  <Fragment>
                    <LabeledControl label="Processing unit / warehouse / orchard name">
                      <Input placeholder="Site name" value={newFarmName} onChange={(event) => setNewFarmName(event.target.value)} />
                    </LabeledControl>
                    <LabeledControl label="County">
                      <select
                        className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                        value={newFarmCounty}
                        onChange={(event) => {
                          const county = event.target.value;
                          setNewFarmCounty(county);
                          setNewFarmSubCounty("");
                        }}
                        aria-label="Site county"
                      >
                        <option value="">Select county</option>
                        {Object.keys(countyOptions).map((county) => <option key={county} value={county}>{county}</option>)}
                      </select>
                    </LabeledControl>
                    <LabeledControl label="Sub-county">
                      <select
                        className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                        value={newFarmSubCounty}
                        onChange={(event) => setNewFarmSubCounty(event.target.value)}
                        aria-label="Site sub-county"
                        disabled={!newFarmCounty}
                      >
                        <option value="">Select sub-county</option>
                        {(countyOptions[newFarmCounty] ?? []).map((subCounty) => <option key={subCounty} value={subCounty}>{subCounty}</option>)}
                      </select>
                    </LabeledControl>
                    <LabeledControl label="Latitude"><Input inputMode="decimal" value={farmLatitude} onChange={(event) => setFarmLatitude(event.target.value)} /></LabeledControl>
                    <LabeledControl label="Longitude"><Input inputMode="decimal" value={farmLongitude} onChange={(event) => setFarmLongitude(event.target.value)} /></LabeledControl>
                    <div className="flex items-end">
                      <Button type="button" variant="secondary" className="w-full" onClick={() => captureGps(setFarmLatitude, setFarmLongitude, setWorkflowError)}>
                        <MapPin className="h-4 w-4" /> Capture GPS
                      </Button>
                    </div>
                  </Fragment>
                )}
              </div>
            </fieldset>

            <fieldset className="border-t border-slate-200 pt-5">
              <legend className="text-sm font-bold text-tic-navy">Product and handling</legend>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <LabeledControl label="Product">
                  <select className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={newFarmCrop} onChange={(event) => {
                    const product = event.target.value;
                    setNewFarmCrop(product);
                    setSelectedSpecializations([]);
                  }}>
                    <option value="">Select product</option>
                    {productOptions.map((product) => <option key={product} value={product}>{product}</option>)}
                  </select>
                </LabeledControl>
                <LabeledControl label="Packaging">
                  <select className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={packagingType} onChange={(event) => setPackagingType(event.target.value)}>
                    <option value="">Select packaging</option>
                    {packagingOptions.map((packaging) => <option key={packaging} value={packaging}>{packaging}</option>)}
                  </select>
                </LabeledControl>
                <LabeledControl label="Atmosphere type">
                  <select className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={atmosphereType} onChange={(event) => setAtmosphereType(event.target.value)}>
                    <option value="">Select atmosphere type</option>
                    <option value="CONTROLLED_COLD_ROOM">Controlled / Cold room</option>
                    <option value="CONVENTIONAL">Conventional</option>
                  </select>
                </LabeledControl>
                <LabeledControl label="Consignee / Receiver"><Input value={consignee} onChange={(event) => setConsignee(event.target.value)} /></LabeledControl>
              </div>
              {productSpecializations[newFarmCrop]?.length ? (
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase text-tic-muted">Specialization / type (select all that apply)</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {productSpecializations[newFarmCrop].map((specialization) => (
                      <label key={specialization} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${selectedSpecializations.includes(specialization) ? "border-tic-green bg-tic-green/5 text-tic-green" : "border-slate-200 text-slate-600"}`}>
                        <input type="checkbox" checked={selectedSpecializations.includes(specialization)} onChange={() => setSelectedSpecializations((current) => current.includes(specialization) ? current.filter((item) => item !== specialization) : [...current, specialization])} />
                        {specialization}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </fieldset>

            <fieldset className="border-t border-slate-200 pt-5">
              <legend className="text-sm font-bold text-tic-navy">Volume and inspection schedule</legend>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <LabeledControl label="Crates per pallet"><Input type="number" min="1" value={unitsPerPallet} onChange={(event) => setUnitsPerPallet(event.target.value)} /></LabeledControl>
                <LabeledControl label="Number of pallets"><Input type="number" min="1" value={palletCount} onChange={(event) => setPalletCount(event.target.value)} /></LabeledControl>
                <LabeledControl label="Total units"><Input value={hasVolumeInputs ? totalUnits.toLocaleString() : ""} readOnly /></LabeledControl>
                <LabeledControl label="Estimated packed weight"><Input value={hasVolumeInputs && packagingType ? `${totalWeightKg.toLocaleString()} kg` : ""} readOnly /></LabeledControl>
                <LabeledControl label="Inspection date">
                  <Input type="date" value={preferredDate} min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} onChange={(event) => setPreferredDate(event.target.value)} />
                </LabeledControl>
              </div>
            </fieldset>

            <fieldset className="border-t border-slate-200 pt-5">
              <legend className="text-sm font-bold text-tic-navy">Optional documents and standards</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {optionalRequirementOptions.map((requirement) => (
                  <label key={requirement} className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input type="checkbox" checked={optionalRequirements.includes(requirement)} onChange={() => setOptionalRequirements((current) => current.includes(requirement) ? current.filter((item) => item !== requirement) : [...current, requirement])} />
                    {requirement}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex justify-end border-t border-slate-200 pt-5">
              <Button className="w-full sm:w-auto" disabled={isSubmittingRequest || activeRequestExists}>
              <Send className="h-4 w-4" />
                {isSubmittingRequest ? "Submitting..." : activeRequestExists ? "Active Request Exists" : "Submit Service Request"}
              </Button>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-bold text-tic-navy">Inspection requests</h2>
          <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
            {(["PENDING", "APPROVED", "REJECTED"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${requestFilter === filter ? "bg-white text-tic-green shadow-sm" : "text-tic-muted hover:text-tic-navy"}`}
                onClick={() => setRequestFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {board.isLoading ? (
            <div className="h-48 animate-pulse bg-slate-50" />
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-sm text-tic-muted">No {requestFilter.toLowerCase()} inspection requests for this role yet.</div>
          ) : (
            filteredRequests.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                mode={mode}
                inspectors={board.data?.inspectors ?? []}
                selectedInspector={selectedInspector}
                scheduledDate={scheduledDate}
                setSelectedInspector={setSelectedInspector}
                setScheduledDate={setScheduledDate}
                assignInspector={() => assignMutation.mutate({ id: request.id })}
                updateClientRequest={(payload) => updateClientRequestMutation.mutateAsync({ id: request.id, payload })}
                isUpdatingClientRequest={updateClientRequestMutation.isPending && updateClientRequestMutation.variables?.id === request.id}
                startInspection={() => {
                  setWorkflowError(null);
                  setWorkflowSuccess(null);
                  startMutation.mutate(request.id);
                }}
                isStartingInspection={startMutation.isPending && startMutation.variables === request.id}
                saveInspectionDraft={(notes, captureData) => draftMutation.mutate({ id: request.id, notes, captureData })}
                isSavingDraft={draftMutation.isPending && draftMutation.variables?.id === request.id}
                submitInspectionWithNotes={(notes, captureData) => submitMutation.mutate({ id: request.id, notes, captureData })}
                isSubmittingInspection={submitMutation.isPending && submitMutation.variables?.id === request.id}
                approve={(editedReport) => approveMutation.mutate({ id: request.id, editedReport })}
                reject={(editedReport, reason) => rejectMutation.mutate({ id: request.id, editedReport, reason })}
                onClosedReportAction={updateClosedReportState}
                formQuestions={(board.data?.formQuestions ?? []).filter((question) => question.formTemplateId === request.formTemplateId)}
              />
            ))
          )}
        </div>
      </section>

      <p className="text-xs text-tic-muted">Signed in as {user?.roles.join(", ")}. Admin can see the full operational board; role accounts see their own queue.</p>
    </div>
  );
}

function apiMessage(caught: unknown) {
  if (!(caught instanceof AxiosError)) return null;
  const responseData = caught.response?.data as ApiError | string | undefined;
  if (typeof responseData === "string" && responseData.trim()) return responseData;
  const apiError = typeof responseData === "object" ? responseData?.error : undefined;
  const fieldErrors = apiError?.fieldErrors?.map((item) => `${item.field}: ${item.message}`).join("; ");
  if (fieldErrors) return fieldErrors;
  if (apiError?.message) return apiError.message;
  if (caught.response?.status) return `Request failed with HTTP ${caught.response.status}${caught.response.statusText ? ` (${caught.response.statusText})` : ""}.`;
  if (caught.request) return "Backend did not respond. Confirm the backend app container is running on port 8080, then retry.";
  return caught.message;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function suggestImageDescription(fileName: string, index: number) {
  const normalized = fileName.toLowerCase();
  if (normalized.includes("temp")) return "View of avocado temperature reading";
  if (normalized.includes("weight")) return "View of avocado box weight verification";
  if (normalized.includes("label")) return "View of product label and traceability details";
  if (normalized.includes("damage") || normalized.includes("defect")) return "View of observed avocado defect or damage";
  if (normalized.includes("container")) return "View of container condition during inspection";
  if (normalized.includes("pallet")) return "View of pallet condition and arrangement";
  if (normalized.includes("cold")) return "View of cold room condition";
  if (normalized.includes("avocado") || normalized.includes("hass")) return "View of avocado appearance";
  return `Inspection evidence photo ${index}`;
}

function captureGps(setLatitude: (value: string) => void, setLongitude: (value: string) => void, setError: (value: string | null) => void) {
  setError(null);
  if (!navigator.geolocation) {
    setError("GPS capture is not available in this browser. Enter the coordinates manually.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      setLatitude(position.coords.latitude.toFixed(6));
      setLongitude(position.coords.longitude.toFixed(6));
    },
    () => setError("Could not capture GPS location. Allow location access or enter coordinates manually."),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-36">
      <p className="text-xs font-semibold uppercase tracking-wide text-tic-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-tic-navy">{value}</p>
    </div>
  );
}

type RequestRowProps = {
  request: InspectionRequestRow;
  mode: WorkflowMode;
  inspectors: Array<{ id: string; label: string }>;
  selectedInspector: string;
  scheduledDate: string;
  setSelectedInspector: (value: string) => void;
  setScheduledDate: (value: string) => void;
  assignInspector: () => void;
  updateClientRequest: (payload: UpdateClientRequestPayload) => Promise<void>;
  isUpdatingClientRequest: boolean;
  startInspection: () => void;
  isStartingInspection: boolean;
  saveInspectionDraft: (notes: string, captureData: ActualInspectionCapture) => void;
  isSavingDraft: boolean;
  submitInspectionWithNotes: (notes: string, captureData: ActualInspectionCapture) => void;
  isSubmittingInspection: boolean;
  approve: (editedReport: string) => void;
  reject: (editedReport: string, reason: string) => void;
  onClosedReportAction: (requestId: string, action: ClosedReportAction) => void;
  formQuestions: Array<{ sectionTitle: string; questionText: string; questionType: string; required: boolean; critical: boolean }>;
};

function RequestRow(props: RequestRowProps) {
  const { request, mode } = props;
  const [inspectorNotes, setInspectorNotes] = useState("");
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, ChecklistAnswer>>({});
  const [extraFields, setExtraFields] = useState<ExtraField[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [photoNames, setPhotoNames] = useState<string[]>([]);
  const [photoEvidence, setPhotoEvidence] = useState<PhotoEvidence[]>([]);
  const photoEvidenceRef = useRef<PhotoEvidence[]>([]);
  const [fieldLatitude, setFieldLatitude] = useState(request.siteLatitude?.toString() ?? "");
  const [fieldLongitude, setFieldLongitude] = useState(request.siteLongitude?.toString() ?? "");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [supervisorReviewed, setSupervisorReviewed] = useState(false);
  const [worksheetHeader, setWorksheetHeader] = useState<Record<string, string>>(() => worksheetHeaderFromRequest(request));
  const [sampleRows, setSampleRows] = useState<WorksheetSampleRow[]>(() => sampleRowsFromRequest(request));
  const [customWorksheetColumns, setCustomWorksheetColumns] = useState<Record<string, WorksheetColumn[]>>({});
  const [activeWorksheetGroup, setActiveWorksheetGroup] = useState(avocadoWorksheetGroups[0].id);
  const [actualInspection, setActualInspection] = useState<ActualInspectionCapture>(() => isActualInspectionCapture(request.inspectionCapture) ? request.inspectionCapture : createEmptyActualInspectionCapture());
  const [editingClientRequest, setEditingClientRequest] = useState(false);
  const canSupervise = mode === "supervisor" || mode === "admin";
  const canInspect = mode === "inspector";
  const checklistQuestions = props.formQuestions.length ? props.formQuestions : dummyChecklist;
  const draftKey = `tic-inspection-draft-${request.id}`;

  const canEditInspection = canInspect && ["IN_PROGRESS", "REJECTED"].includes(request.status);
  const canEditClientSubmission = !["COMPLETED", "CANCELLED"].includes(request.status)
    && (mode === "supervisor" || (canInspect && ["ASSIGNED", "IN_PROGRESS", "REJECTED", "SUBMITTED"].includes(request.status)));
  useEffect(() => {
    if (!canEditInspection) return;
    const saved = window.localStorage.getItem(draftKey);
    if (!saved) {
      setInspectorNotes(request.inspectorNotes ?? "");
      if (isActualInspectionCapture(request.inspectionCapture)) {
        setActualInspection(request.inspectionCapture);
      }
      return;
    }
    try {
      const draft = JSON.parse(saved) as Partial<InspectionDraft>;
      setInspectorNotes(draft.inspectorNotes ?? "");
      setChecklistAnswers(draft.checklistAnswers ?? {});
      setExtraFields(draft.extraFields ?? []);
      setPhotoNames(draft.photoNames ?? []);
      setFieldLatitude(draft.fieldLatitude ?? "");
      setFieldLongitude(draft.fieldLongitude ?? "");
      setWorksheetHeader({ ...worksheetHeaderFromRequest(request), ...(draft.worksheetHeader ?? {}) });
      setSampleRows(draft.sampleRows?.length ? draft.sampleRows : sampleRowsFromRequest(request));
      setCustomWorksheetColumns(draft.customWorksheetColumns ?? {});
      setActualInspection(draft.actualInspection && isActualInspectionCapture(draft.actualInspection) ? draft.actualInspection : (isActualInspectionCapture(request.inspectionCapture) ? request.inspectionCapture : createEmptyActualInspectionCapture()));
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [canEditInspection, draftKey, request]);

  useEffect(() => {
    photoEvidenceRef.current = photoEvidence;
  }, [photoEvidence]);

  useEffect(() => {
    return () => {
      photoEvidenceRef.current.forEach((photo) => URL.revokeObjectURL(photo.url));
    };
  }, []);

  useEffect(() => {
    if (!canEditInspection) return;
    const draft: InspectionDraft = {
      inspectorNotes,
      checklistAnswers,
      extraFields,
      photoNames,
      fieldLatitude,
      fieldLongitude,
      worksheetHeader,
      sampleRows,
      customWorksheetColumns,
      actualInspection
    };
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // The server-backed Save Draft action remains available when image data exceeds browser storage limits.
    }
  }, [actualInspection, canEditInspection, checklistAnswers, customWorksheetColumns, draftKey, extraFields, fieldLatitude, fieldLongitude, inspectorNotes, photoNames, sampleRows, worksheetHeader]);
  const updateChecklist = (key: string, answer: Partial<ChecklistAnswer>) => {
    setChecklistAnswers((current) => ({
      ...current,
      [key]: { value: current[key]?.value ?? "", checked: current[key]?.checked ?? false, ...answer }
    }));
  };
  const addExtraField = () => {
    if (!newFieldLabel.trim()) return;
    setExtraFields((current) => [...current, { id: crypto.randomUUID(), label: newFieldLabel.trim(), value: "" }]);
    setNewFieldLabel("");
  };
  const updateExtraField = (id: string, value: string) => {
    setExtraFields((current) => current.map((field) => field.id === id ? { ...field, value } : field));
  };
  const updateWorksheetHeader = (field: string, value: string) => {
    setWorksheetHeader((current) => ({ ...current, [field]: value }));
  };
  const updateSampleRow = (rowIndex: number, key: string, value: string) => {
    setSampleRows((current) => current.map((row, index) => index === rowIndex ? { ...row, [key]: value } : row));
  };
  const addSampleRow = () => {
    setSampleRows((current) => [...current, createDefaultSample(current.length + 1)]);
  };
  const removeSampleRow = (rowIndex: number) => {
    setSampleRows((current) => current.filter((_row, index) => index !== rowIndex));
  };
  const addWorksheetColumn = (groupId: string, label: string) => {
    if (!label.trim()) return;
    const column: WorksheetColumn = {
      key: `custom_${groupId}_${crypto.randomUUID()}`,
      label: label.trim(),
      inputType: "text",
      custom: true
    };
    setCustomWorksheetColumns((current) => ({
      ...current,
      [groupId]: [...(current[groupId] ?? []), column]
    }));
  };
  const removeWorksheetColumn = (groupId: string, key: string) => {
    setCustomWorksheetColumns((current) => ({
      ...current,
      [groupId]: (current[groupId] ?? []).filter((column) => column.key !== key)
    }));
    setSampleRows((current) => current.map((row) => {
      const next = { ...row };
      delete next[key];
      return next;
    }));
  };
  const addPhotoEvidence = async (files: FileList | null) => {
    const uploadStartIndex = photoEvidence.length;
    const nextPhotos = await Promise.all(Array.from(files ?? []).map(async (file, index) => {
      const dataUrl = await fileToDataUrl(file);
      return {
        id: crypto.randomUUID(),
        name: file.name,
        url: dataUrl,
        dataUrl,
        description: suggestImageDescription(file.name, uploadStartIndex + index + 1)
      };
    }));
    if (!nextPhotos.length) return;
    setPhotoEvidence((current) => [...current, ...nextPhotos]);
    setPhotoNames((current) => [...current, ...nextPhotos.map((photo) => photo.name)]);
  };
  const removePhotoEvidence = (id: string) => {
    setPhotoEvidence((current) => {
      const removed = current.find((photo) => photo.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      const next = current.filter((photo) => photo.id !== id);
      setPhotoNames(next.map((photo) => photo.name));
      return next;
    });
  };
  const updatePhotoDescription = (id: string, description: string) => {
    setPhotoEvidence((current) => current.map((photo) => photo.id === id ? { ...photo, description } : photo));
  };
  const saveDraft = () => {
    const draft: InspectionDraft = { inspectorNotes, checklistAnswers, extraFields, photoNames, fieldLatitude, fieldLongitude, worksheetHeader, sampleRows, customWorksheetColumns, actualInspection };
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // Continue with the server draft when local browser storage is full.
    }
    props.saveInspectionDraft(inspectorNotes, actualInspection);
    setSubmissionError(null);
    setFieldError(null);
  };
  const validateInspection = () => {
    const actualCaptureError = validateActualInspectionCapture(actualInspection, request.packagingType);
    const checkedRequired = checklistQuestions.filter((question) => question.required).every((question) => checklistAnswers[`${question.sectionTitle}-${question.questionText}`]?.checked);
    if (actualCaptureError) return actualCaptureError;
    if (!checkedRequired) return "Check all required standard checklist items before submitting.";
    if (!inspectorNotes.trim()) return "Add inspector notes before submitting.";
    return null;
  };
  const submitFieldForm = () => {
    setSubmissionError(null);
    const validationMessage = validateInspection();
    if (validationMessage) {
      setSubmissionError(validationMessage);
      return;
    }
    const checklistSummary = checklistQuestions.map((question) => {
      const key = `${question.sectionTitle}-${question.questionText}`;
      const answer = checklistAnswers[key];
      return `${question.questionText}: ${answer?.checked ? "Checked" : "Not checked"}${answer?.value ? ` (${answer.value})` : ""}`;
    });
    const customSummary = extraFields.map((field) => `${field.label}: ${field.value || "Not provided"}`);
    const headerSummary = avocadoHeaderFields.map((field) => `${field}: ${worksheetHeader[field] || "Not provided"}`);
    const worksheetColumns = avocadoWorksheetGroups.flatMap((group) => [...group.columns, ...(customWorksheetColumns[group.id] ?? [])]);
    const sampleSummary = sampleRows.map((row) => {
      const defects = ["decay", "stemEndRot", "mold", "bruises", "anthracnoseSevere", "pestDamage", "blackSpot"]
        .map((key) => `${key}=${row[key] || "0"}`)
        .join(", ");
      const customValues = worksheetColumns
        .filter((column) => column.custom && row[column.key]?.trim())
        .map((column) => `${column.label}=${row[column.key]}`)
        .join(", ");
      return `Sample ${row.sampleNumber || "?"}: count=${row.count || "-"}, grower=${row.grower || "-"}, variety=${row.variety || "-"}, netWeight=${row.netWeight || "-"}, temp=${row.temperature || "-"}, score=${row.finalScore || "-"}, decision=${row.sampleDecision || "-"}, defects(${defects})${customValues ? `, custom(${customValues})` : ""}`;
    });
    const actualPhotos = collectActualInspectionPhotos(actualInspection);
    const allEvidence = [...actualPhotos, ...photoEvidence.map((photo) => ({ id: photo.id, name: photo.name, dataUrl: photo.dataUrl, description: photo.description }))];
    props.submitInspectionWithNotes([
      `Avocado worksheet header: ${headerSummary.join("; ")}`,
      `Avocado sample matrix: ${sampleSummary.join("; ")}`,
      `Standard checklist: ${checklistSummary.join("; ")}`,
      `Images attached: ${allEvidence.length ? allEvidence.map((photo) => photo.name).join(", ") : "None"}`,
      `Image evidence: ${photoEvidence.length ? JSON.stringify(photoEvidence.map((photo, index) => ({ name: photo.name, dataUrl: photo.dataUrl, description: photo.description || `Additional inspection evidence photo ${index + 1}` }))) : "[]"}`,
      `Field GPS: ${fieldLatitude && fieldLongitude ? `${fieldLatitude}, ${fieldLongitude}` : "Not captured"}`,
      `Extra client fields: ${customSummary.length ? customSummary.join("; ") : "None"}`,
      `Inspector notes: ${inspectorNotes || "None"}`
    ].join(" | "), actualInspection);
  };

  return (
    <article className={canEditInspection ? "grid min-w-0 gap-4 p-5" : "grid min-w-0 gap-4 p-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]"}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(request.status)}`}>{request.status}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-tic-muted">{request.classification}</span>
        </div>
        <h3 className="mt-3 text-lg font-bold text-tic-navy">{request.farmName}</h3>
        <p className="mt-1 text-sm text-tic-muted">
          {request.clientName} · {designationLabel(request.designation)} · {request.inspectionType} · {request.preferredDate ?? "date not set"}
        </p>
        <dl className="mt-4 grid gap-x-5 gap-y-3 border-y border-slate-100 py-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Organization" value={request.organizationName} />
          <Info label="Client type" value={designationLabel(request.designation)} />
          <Info label="Product" value={[request.product, request.productSpecializations.join(", ")].filter(Boolean).join(" - ") || "Not provided"} />
          <Info label="Packaging" value={request.packagingType ?? "Not provided"} />
          <Info label="Atmosphere" value={codeLabel(request.atmosphereType)} />
          <Info label="Inspection unit" value={codeLabel(request.inspectionUnit)} />
          <Info label="Volume" value={`${request.totalUnits?.toLocaleString() ?? 0} units / ${request.totalWeightKg?.toLocaleString() ?? 0} kg`} />
          <Info label="Inspection date" value={request.preferredDate ?? "Not set"} />
          <Info label="Receiver" value={request.consignee ?? "Not provided"} />
          <Info label="Site location" value={`${request.siteCounty}${request.siteSubCounty ? `, ${request.siteSubCounty}` : ""}`} />
          <Info label="GPS" value={request.siteLatitude != null && request.siteLongitude != null ? `${request.siteLatitude}, ${request.siteLongitude}` : "Not captured"} />
          <Info label="Optional requirements" value={request.optionalRequirements.length ? request.optionalRequirements.join(", ") : "None selected"} />
        </dl>
        {request.status === "REJECTED" && request.rejectionReason ? (
          <div className="mt-3 rounded-md border border-tic-red/20 bg-tic-red/10 p-3 text-sm text-tic-red">
            <span className="font-bold">Rejection reason:</span> {request.rejectionReason}
          </div>
        ) : null}
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <Info label="Inspector" value={request.inspectorName ?? "Not assigned"} />
        </dl>
        {canEditClientSubmission ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <Button type="button" variant="secondary" onClick={() => setEditingClientRequest((current) => !current)}>
              <Pencil className="h-4 w-4" />
              {editingClientRequest ? "Close Request Editor" : "Edit Client Request"}
            </Button>
            {editingClientRequest ? (
              <ClientRequestEditor
                request={request}
                saving={props.isUpdatingClientRequest}
                onCancel={() => setEditingClientRequest(false)}
                onSave={async (payload) => {
                  await props.updateClientRequest(payload);
                  setEditingClientRequest(false);
                }}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={canEditInspection ? "min-w-0 space-y-3" : "min-w-0 space-y-3 rounded-lg bg-slate-50 p-4"}>
        {canSupervise && ["PENDING_REVIEW", "PENDING_ASSIGNMENT"].includes(request.status) && (
          <div className="grid gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-tic-muted">Allocate to available inspector</p>
            <select className="h-10 rounded-md border border-slate-200 px-3 text-sm" value={props.selectedInspector} onChange={(event) => props.setSelectedInspector(event.target.value)}>
              <option value="">Select available inspector</option>
              {props.inspectors.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <Input type="date" value={props.scheduledDate} onChange={(event) => props.setScheduledDate(event.target.value)} />
            <Button onClick={props.assignInspector} disabled={!props.selectedInspector || !props.scheduledDate}>
              <UserCheck className="h-4 w-4" />
              Assign Inspector
            </Button>
          </div>
        )}

        {canInspect && request.status === "ASSIGNED" && (
          <Button className="w-full" type="button" onClick={props.startInspection} disabled={props.isStartingInspection}>
            <Play className="h-4 w-4" />
            {props.isStartingInspection ? "Opening form..." : "Start Inspection & Open Form"}
          </Button>
        )}

        {canInspect && ["ASSIGNED", "IN_PROGRESS", "REJECTED"].includes(request.status) ? (
          <CropManualPanel product={request.product} />
        ) : null}

        {canEditInspection && (
          <div className="space-y-3">
            <ActualInspectionForm capture={actualInspection} packagingType={request.packagingType} onChange={setActualInspection} />

            <details className="border-t border-slate-200 py-5">
              <summary className="cursor-pointer text-sm font-bold text-tic-navy">Additional commodity quality matrix</summary>
              <p className="mt-2 text-sm text-slate-600">Use this optional matrix when the assignment requires detailed defect scoring or extra columns.</p>
              <div className="mt-4">
                <AvocadoWorksheetEditor
                  header={worksheetHeader}
                  rows={sampleRows}
                  activeGroup={activeWorksheetGroup}
                  setActiveGroup={setActiveWorksheetGroup}
                  updateHeader={updateWorksheetHeader}
                  updateSampleRow={updateSampleRow}
                  addSampleRow={addSampleRow}
                  removeSampleRow={removeSampleRow}
                  customColumns={customWorksheetColumns}
                  addCustomColumn={addWorksheetColumn}
                  removeCustomColumn={removeWorksheetColumn}
                />
              </div>
            </details>

            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-tic-muted">General inspection checks</p>
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                {checklistQuestions.slice(0, 8).map((question) => (
                  <ChecklistControl
                    key={`${question.sectionTitle}-${question.questionText}`}
                    question={question}
                    answer={checklistAnswers[`${question.sectionTitle}-${question.questionText}`]}
                    onChange={(answer) => updateChecklist(`${question.sectionTitle}-${question.questionText}`, answer)}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-tic-muted">Evidence and GPS</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-tic-navy hover:bg-slate-50">
                  <Image className="mr-2 h-4 w-4" />
                  Insert images
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      addPhotoEvidence(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
                <Button type="button" variant="secondary" onClick={() => captureGps(setFieldLatitude, setFieldLongitude, setFieldError)}>
                  <MapPin className="h-4 w-4" />
                  Capture GPS
                </Button>
              </div>
              {photoEvidence.length ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {photoEvidence.map((photo) => (
                    <figure key={photo.id} className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                      <img src={photo.url} alt={`Preview of ${photo.name}`} className="h-32 w-full object-cover" />
                      <figcaption className="space-y-2 px-2 py-2 text-xs text-tic-muted">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{photo.name}</span>
                          <button type="button" className="rounded p-1 text-tic-red hover:bg-tic-red/10" onClick={() => removePhotoEvidence(photo.id)} aria-label={`Remove ${photo.name}`}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <textarea
                          className="min-h-16 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-tic-green focus:ring-2 focus:ring-tic-green/15"
                          placeholder="Brief photo description, e.g. View of avocado damage"
                          value={photo.description}
                          onChange={(event) => updatePhotoDescription(photo.id, event.target.value)}
                        />
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : photoNames.length ? (
                <p className="mt-2 text-xs text-tic-muted">Draft image names: {photoNames.join(", ")}. Reinsert files to preview them in this browser session.</p>
              ) : null}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Input placeholder="Latitude" inputMode="decimal" value={fieldLatitude} onChange={(event) => setFieldLatitude(event.target.value)} />
                <Input placeholder="Longitude" inputMode="decimal" value={fieldLongitude} onChange={(event) => setFieldLongitude(event.target.value)} />
              </div>
              {fieldError ? <p className="mt-2 text-xs font-semibold text-tic-red">{fieldError}</p> : null}
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-tic-muted">Extra client-required fields</p>
              <div className="mt-3 flex gap-2">
                <Input placeholder="Field label, e.g. Packhouse code" value={newFieldLabel} onChange={(event) => setNewFieldLabel(event.target.value)} />
                <Button type="button" variant="secondary" className="shrink-0" onClick={addExtraField} aria-label="Add custom field">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                {extraFields.map((field) => (
                  <label key={field.id} className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-tic-muted">
                    {field.label}
                    <Input value={field.value} onChange={(event) => updateExtraField(field.id, event.target.value)} />
                  </label>
                ))}
              </div>
            </div>
            <textarea
              className="min-h-28 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-tic-green focus:ring-2 focus:ring-tic-green/15"
              placeholder="Add inspection notes, exceptions, photo observations, or more info for supervisor review"
              value={inspectorNotes}
              onChange={(event) => setInspectorNotes(event.target.value)}
            />
            {submissionError ? <div className="rounded-md border border-tic-red/20 bg-tic-red/10 p-3 text-sm text-tic-red">{submissionError}</div> : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="secondary" onClick={saveDraft} disabled={props.isSavingDraft}>
                {props.isSavingDraft ? "Saving Draft..." : "Save Draft"}
              </Button>
              <Button className="w-full" type="button" onClick={submitFieldForm} disabled={props.isSubmittingInspection}>
                <ClipboardList className="h-4 w-4" />
                {props.isSubmittingInspection ? "Sending report..." : "Submit to Supervisor"}
              </Button>
            </div>
          </div>
        )}

        {canSupervise && request.status === "SUBMITTED" && (
          <SupervisorReviewPanel
            request={request}
            reviewed={supervisorReviewed}
            setReviewed={setSupervisorReviewed}
            approve={props.approve}
            reject={props.reject}
          />
        )}

        {request.status === "COMPLETED" && (canSupervise || canInspect || mode === "farmer") && (
          <GeneratedReportsPanel request={request} mode={mode} onClosedReportAction={props.onClosedReportAction} />
        )}
      </div>
    </article>
  );
}

function ClientRequestEditor({
  request,
  saving,
  onSave,
  onCancel
}: {
  request: InspectionRequestRow;
  saving: boolean;
  onSave: (payload: UpdateClientRequestPayload) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState({
    siteName: request.farmName,
    county: request.siteCounty,
    subCounty: request.siteSubCounty ?? "",
    latitude: request.siteLatitude?.toString() ?? "",
    longitude: request.siteLongitude?.toString() ?? "",
    classification: request.classification,
    inspectionDate: request.preferredDate ?? "",
    notes: request.notes ?? "",
    serviceRequest: request.serviceRequest ?? "",
    product: request.product ?? "",
    productSpecializations: request.productSpecializations,
    packagingType: request.packagingType ?? "",
    atmosphereType: request.atmosphereType ?? "",
    inspectionUnit: request.inspectionUnit ?? "",
    unitsPerPallet: request.unitsPerPallet?.toString() ?? "",
    palletCount: request.palletCount?.toString() ?? "",
    consignee: request.consignee ?? "",
    optionalRequirements: request.optionalRequirements
  });
  const [error, setError] = useState<string | null>(null);
  const unitsPerPallet = Math.max(0, Number(draft.unitsPerPallet) || 0);
  const palletCount = Math.max(0, Number(draft.palletCount) || 0);
  const totalUnits = unitsPerPallet * palletCount;
  const packageWeightKg = draft.packagingType.toUpperCase().startsWith("10KG") ? 10 : 4;
  const totalWeightKg = totalUnits * packageWeightKg;
  const subCounties = countyOptions[draft.county] ?? [];
  const update = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const toggleSpecialization = (specialization: string) => {
    setDraft((current) => ({
      ...current,
      productSpecializations: current.productSpecializations.includes(specialization)
        ? current.productSpecializations.filter((item) => item !== specialization)
        : [...current.productSpecializations, specialization]
    }));
  };
  const toggleRequirement = (requirement: string) => {
    setDraft((current) => ({
      ...current,
      optionalRequirements: current.optionalRequirements.includes(requirement)
        ? current.optionalRequirements.filter((item) => item !== requirement)
        : [...current.optionalRequirements, requirement]
    }));
  };
  const submit = async () => {
    setError(null);
    if (!draft.siteName.trim() || !draft.county || !draft.serviceRequest || !draft.product
      || !draft.packagingType || !draft.atmosphereType || !draft.inspectionUnit
      || !draft.inspectionDate || !draft.consignee.trim() || unitsPerPallet <= 0 || palletCount <= 0) {
      setError("Complete the required request, site, product, volume, date, and receiver fields.");
      return;
    }
    const serviceLabel = serviceOptions.find((option) => option.value === draft.serviceRequest)?.label ?? draft.serviceRequest;
    try {
      await onSave({
        siteName: draft.siteName.trim(),
        county: draft.county,
        subCounty: draft.subCounty,
        latitude: draft.latitude.trim() ? Number(draft.latitude) : undefined,
        longitude: draft.longitude.trim() ? Number(draft.longitude) : undefined,
        inspectionType: serviceLabel,
        classification: draft.classification,
        inspectionDate: draft.inspectionDate,
        notes: draft.notes,
        serviceRequest: draft.serviceRequest,
        product: draft.product,
        productSpecializations: draft.productSpecializations,
        packagingType: draft.packagingType,
        atmosphereType: draft.atmosphereType,
        inspectionUnit: draft.inspectionUnit,
        unitsPerPallet,
        palletCount,
        totalUnits,
        totalWeightKg,
        consignee: draft.consignee.trim(),
        optionalRequirements: draft.optionalRequirements
      });
    } catch (caught) {
      setError(apiMessage(caught) ?? "Could not update the client request.");
    }
  };

  return (
    <section className="mt-4 border-l-2 border-tic-green bg-slate-50 p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-tic-muted">Editable client submission</p>
        <p className="mt-1 text-sm text-slate-600">Correct request and site details before the inspection is closed. Client identity remains linked to the original account.</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <LabeledControl label="Site / facility name"><Input value={draft.siteName} onChange={(event) => update("siteName", event.target.value)} /></LabeledControl>
        <LabeledControl label="Classification">
          <select className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={draft.classification} onChange={(event) => update("classification", event.target.value as typeof draft.classification)}>
            <option value="ORIGIN">Origin</option><option value="DESTINATION">Destination</option><option value="DAMAGE">Damage</option>
          </select>
        </LabeledControl>
        <LabeledControl label="County">
          <select className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={draft.county} onChange={(event) => setDraft((current) => ({ ...current, county: event.target.value, subCounty: "" }))}>
            <option value="">Select county</option>
            {draft.county && !countyOptions[draft.county] ? <option value={draft.county}>{draft.county}</option> : null}
            {Object.keys(countyOptions).map((county) => <option key={county} value={county}>{county}</option>)}
          </select>
        </LabeledControl>
        <LabeledControl label="Sub-county">
          <select className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={draft.subCounty} onChange={(event) => update("subCounty", event.target.value)}>
            <option value="">Select sub-county</option>
            {draft.subCounty && !subCounties.includes(draft.subCounty) ? <option value={draft.subCounty}>{draft.subCounty}</option> : null}
            {subCounties.map((subCounty) => <option key={subCounty} value={subCounty}>{subCounty}</option>)}
          </select>
        </LabeledControl>
        <LabeledControl label="Latitude"><Input inputMode="decimal" value={draft.latitude} onChange={(event) => update("latitude", event.target.value)} /></LabeledControl>
        <LabeledControl label="Longitude"><Input inputMode="decimal" value={draft.longitude} onChange={(event) => update("longitude", event.target.value)} /></LabeledControl>
        <Button type="button" variant="secondary" className="sm:col-span-2" onClick={() => captureGps((value) => update("latitude", value), (value) => update("longitude", value), setError)}>
          <MapPin className="h-4 w-4" /> Capture Current GPS
        </Button>
        <LabeledControl label="Service request">
          <select className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={draft.serviceRequest} onChange={(event) => update("serviceRequest", event.target.value)}>
            <option value="">Select service</option>
            {serviceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </LabeledControl>
        <LabeledControl label="Inspection date"><Input type="date" value={draft.inspectionDate} onChange={(event) => update("inspectionDate", event.target.value)} /></LabeledControl>
        <LabeledControl label="Product">
          <select className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={draft.product} onChange={(event) => setDraft((current) => ({ ...current, product: event.target.value, productSpecializations: [] }))}>
            <option value="">Select product</option>
            {draft.product && !productOptions.includes(draft.product) ? <option value={draft.product}>{draft.product}</option> : null}
            {productOptions.map((product) => <option key={product} value={product}>{product}</option>)}
          </select>
        </LabeledControl>
        <LabeledControl label="Packaging">
          <select className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={draft.packagingType} onChange={(event) => update("packagingType", event.target.value)}>
            <option value="">Select packaging</option>{packagingOptions.map((packaging) => <option key={packaging} value={packaging}>{packaging}</option>)}
          </select>
        </LabeledControl>
        <LabeledControl label="Atmosphere">
          <select className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={draft.atmosphereType} onChange={(event) => update("atmosphereType", event.target.value)}>
            <option value="">Select atmosphere</option><option value="CONTROLLED_COLD_ROOM">Controlled / Cold Room</option><option value="CONVENTIONAL">Conventional</option>
          </select>
        </LabeledControl>
        <LabeledControl label="Inspection unit">
          <select className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={draft.inspectionUnit} onChange={(event) => update("inspectionUnit", event.target.value)}>
            <option value="">Select unit</option><option value="COLD_ROOM">Cold Room / Warehouse</option><option value="REEFER_UNIT">Reefer Unit</option><option value="ORCHARD">Orchard / Field</option>
          </select>
        </LabeledControl>
        <LabeledControl label="Consignee / receiver"><Input value={draft.consignee} onChange={(event) => update("consignee", event.target.value)} /></LabeledControl>
        <LabeledControl label="Crates per pallet"><Input type="number" min="1" value={draft.unitsPerPallet} onChange={(event) => update("unitsPerPallet", event.target.value)} /></LabeledControl>
        <LabeledControl label="Number of pallets"><Input type="number" min="1" value={draft.palletCount} onChange={(event) => update("palletCount", event.target.value)} /></LabeledControl>
        <LabeledControl label="Total units"><Input value={totalUnits ? totalUnits.toLocaleString() : ""} readOnly /></LabeledControl>
        <LabeledControl label="Estimated packed weight"><Input value={totalWeightKg ? `${totalWeightKg.toLocaleString()} kg` : ""} readOnly /></LabeledControl>
      </div>
      {productSpecializations[draft.product]?.length ? (
        <fieldset className="mt-4">
          <legend className="text-xs font-bold uppercase tracking-wide text-tic-muted">Specialization / type</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {productSpecializations[draft.product].map((specialization) => (
              <label key={specialization} className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" checked={draft.productSpecializations.includes(specialization)} onChange={() => toggleSpecialization(specialization)} /> {specialization}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <fieldset className="mt-4">
        <legend className="text-xs font-bold uppercase tracking-wide text-tic-muted">Optional documents and standards</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {optionalRequirementOptions.map((requirement) => (
            <label key={requirement} className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <input type="checkbox" checked={draft.optionalRequirements.includes(requirement)} onChange={() => toggleRequirement(requirement)} /> {requirement}
            </label>
          ))}
        </div>
      </fieldset>
      <LabeledControl label="Client request notes">
        <textarea className="mt-2 min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={draft.notes} onChange={(event) => update("notes", event.target.value)} />
      </LabeledControl>
      {error ? <p className="mt-3 rounded-md border border-tic-red/20 bg-tic-red/10 p-3 text-sm text-tic-red">{error}</p> : null}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="button" onClick={() => void submit()} disabled={saving}>{saving ? "Saving Changes..." : "Save Request Changes"}</Button>
      </div>
    </section>
  );
}

function ChecklistControl({
  question,
  answer,
  onChange
}: {
  question: { sectionTitle: string; questionText: string; questionType: string; required: boolean; critical: boolean };
  answer?: ChecklistAnswer;
  onChange: (answer: Partial<ChecklistAnswer>) => void;
}) {
  const type = question.questionType.toUpperCase();
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-300 text-tic-green focus:ring-tic-green"
          checked={answer?.checked ?? false}
          onChange={(event) => onChange({ checked: event.target.checked })}
        />
        <span className="flex-1">
          <span className="block font-medium text-tic-navy">{question.questionText}</span>
          <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-tic-muted">{question.required ? "Required" : "Optional"} · {type}</span>
        </span>
      </label>
      {type !== "BOOLEAN" && type !== "CHECKBOX" ? (
        <Input
          className="mt-2"
          type={type === "NUMBER" ? "number" : "text"}
          placeholder={`Capture ${question.questionText.toLowerCase()}`}
          value={answer?.value ?? ""}
          onChange={(event) => onChange({ value: event.target.value })}
        />
      ) : null}
    </div>
  );
}

function SupervisorReviewPanel({
  request,
  reviewed,
  setReviewed,
  approve,
  reject
}: {
  request: InspectionRequestRow;
  reviewed: boolean;
  setReviewed: (value: boolean) => void;
  approve: (editedReport: string) => void;
  reject: (editedReport: string, reason: string) => void;
}) {
  const inspectorReport = request.inspectorNotes?.split(" | ").filter(Boolean) ?? [];
  const inspectorReportTables = buildClosedReportTables(request, "supervisor", {
    summary: false,
    standard: false,
    requestNotes: false,
    fieldNotes: true,
    evidence: true,
    gps: true,
    rejectionHistory: false
  });
  const reviewDraftKey = `tic-supervisor-review-draft-${request.id}`;
  const [editedReport, setEditedReport] = useState(extractReportPart(request.inspectorNotes ?? "", "Supervisor notes") ?? "");
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(reviewDraftKey);
    if (saved) {
      setEditedReport(saved);
    }
  }, [reviewDraftKey]);

  useEffect(() => {
    if (!editedReport.trim()) return;
    window.localStorage.setItem(reviewDraftKey, editedReport);
  }, [editedReport, reviewDraftKey]);

  const saveReviewDraft = () => {
    window.localStorage.setItem(reviewDraftKey, editedReport);
    setDraftSaved(true);
    setReviewError(null);
  };
  const approveReviewedReport = () => {
    if (!editedReport.trim()) {
      setReviewError("Add supervisor conclusion notes before approving the report.");
      return;
    }
    window.localStorage.removeItem(reviewDraftKey);
    approve(mergeSupervisorNotesIntoReport(request.inspectorNotes ?? "", editedReport));
  };
  const rejectReviewedReport = () => {
    if (!editedReport.trim()) {
      setReviewError("Add supervisor review notes before rejecting the report.");
      return;
    }
    if (!rejectionReason.trim()) {
      setReviewError("Enter a rejection reason so the inspector knows what to correct.");
      return;
    }
    window.localStorage.removeItem(reviewDraftKey);
    reject(mergeSupervisorNotesIntoReport(request.inspectorNotes ?? "", editedReport), rejectionReason);
  };

  return (
    <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-tic-muted">Supervisor report review</p>
        <p className="mt-1 text-sm text-slate-600">Review the inspector capture before approving or rejecting this request.</p>
      </div>

      <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
        <p className="font-bold text-tic-navy">Request summary</p>
        <p className="mt-1">{request.farmName} · {request.classification} · Preferred {request.preferredDate ?? "not set"}</p>
        <p className="mt-1">{request.clientName} · {codeLabel(request.serviceRequest)} · {request.product ?? "Product not provided"}</p>
      </div>

      <div className="max-h-[34rem] overflow-y-auto rounded-md border border-slate-200 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-tic-muted">Inspector captured report</p>
        {inspectorReport.length ? (
          <ReportTablesPreview tables={inspectorReportTables} />
        ) : (
          <p className="mt-3 rounded-md border border-tic-red/20 bg-tic-red/10 p-3 text-sm text-tic-red">
            No inspector report capture is available yet. Approval is disabled until the captured report is present.
          </p>
        )}
      </div>

      <label className="grid gap-2 text-xs font-bold uppercase tracking-wide text-tic-muted">
        Supervisor conclusion and final report notes
        <textarea
          className="min-h-40 rounded-md border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-tic-green focus:ring-2 focus:ring-tic-green/15"
          placeholder="Write the supervisor's conclusion, corrections, exclusions, or final remarks. Image data is kept in the structured report and is not shown here."
          value={editedReport}
          onChange={(event) => {
            setEditedReport(event.target.value);
            setDraftSaved(false);
          }}
        />
      </label>
      <Button type="button" variant="secondary" onClick={saveReviewDraft}>
        {draftSaved ? "Draft Saved" : "Save Review Draft"}
      </Button>

      <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-300 text-tic-green focus:ring-tic-green"
          checked={reviewed}
          disabled={!inspectorReport.length}
          onChange={(event) => setReviewed(event.target.checked)}
        />
        <span>I have reviewed the inspector's captured report, checklist answers, evidence notes, GPS details, and extra client-required fields.</span>
      </label>

      <textarea
        className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-tic-green focus:ring-2 focus:ring-tic-green/15"
        placeholder="Required when rejecting: explain what the inspector must correct"
        value={rejectionReason}
        onChange={(event) => setRejectionReason(event.target.value)}
      />
      {reviewError ? <div className="rounded-md border border-tic-red/20 bg-tic-red/10 p-3 text-sm text-tic-red">{reviewError}</div> : null}

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={approveReviewedReport} disabled={!reviewed || !inspectorReport.length}>
          <CheckCircle2 className="h-4 w-4" />
          Approve
        </Button>
        <Button variant="secondary" onClick={rejectReviewedReport} disabled={!reviewed || !inspectorReport.length}>Reject</Button>
      </div>
    </div>
  );
}

function AvocadoWorksheetEditor({
  header,
  rows,
  activeGroup,
  setActiveGroup,
  updateHeader,
  updateSampleRow,
  addSampleRow,
  removeSampleRow,
  customColumns,
  addCustomColumn,
  removeCustomColumn
}: {
  header: Record<string, string>;
  rows: WorksheetSampleRow[];
  activeGroup: string;
  setActiveGroup: (value: string) => void;
  updateHeader: (field: string, value: string) => void;
  updateSampleRow: (rowIndex: number, key: string, value: string) => void;
  addSampleRow: () => void;
  removeSampleRow: (rowIndex: number) => void;
  customColumns: Record<string, WorksheetColumn[]>;
  addCustomColumn: (groupId: string, label: string) => void;
  removeCustomColumn: (groupId: string, key: string) => void;
}) {
  const [newColumnLabel, setNewColumnLabel] = useState("");
  const group = avocadoWorksheetGroups.find((item) => item.id === activeGroup) ?? avocadoWorksheetGroups[0];
  const activeColumns = [...group.columns, ...(customColumns[group.id] ?? [])];
  const addActiveColumn = () => {
    addCustomColumn(group.id, newColumnLabel);
    setNewColumnLabel("");
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:block">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-tic-muted">Avocado inspection worksheet</p>
          <h4 className="mt-1 text-sm font-bold text-tic-navy">Commodity matrix based on the uploaded worksheet</h4>
        </div>
        <Button type="button" variant="secondary" onClick={addSampleRow}>
          <Plus className="h-4 w-4" />
          Add Row
        </Button>
      </div>

      <div className="mt-3 grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {avocadoHeaderFields.map((field) => (
          <label key={field} className="grid min-w-0 gap-1 text-[11px] font-bold uppercase tracking-wide text-tic-muted">
            {field}
            <Input type={field.toLowerCase().includes("date") ? "date" : "text"} value={header[field] ?? ""} onChange={(event) => updateHeader(field, event.target.value)} />
          </label>
        ))}
      </div>

      <div className="mt-4 flex max-w-full gap-2 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-1">
        {avocadoWorksheetGroups.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`shrink-0 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${activeGroup === item.id ? "bg-white text-tic-green shadow-sm" : "text-tic-muted hover:text-tic-navy"}`}
            onClick={() => setActiveGroup(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 sm:grid-cols-[1fr_auto]">
        <Input
          placeholder={`Add extra column to ${group.label.toLowerCase()}, e.g. Dry matter`}
          value={newColumnLabel}
          onChange={(event) => setNewColumnLabel(event.target.value)}
        />
        <Button type="button" variant="secondary" onClick={addActiveColumn} disabled={!newColumnLabel.trim()}>
          <Plus className="h-4 w-4" />
          Add Column
        </Button>
      </div>

      <div className="mt-3 max-w-full overflow-x-auto rounded-md border border-slate-200">
        <table className="w-max min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border border-slate-200 bg-slate-100 px-2 py-2 text-left text-xs font-bold uppercase tracking-wide text-tic-muted">Sample</th>
              {activeColumns.map((column) => (
                <th key={column.key} className="w-40 min-w-40 border border-slate-200 bg-slate-100 px-2 py-2 text-left text-xs font-bold uppercase tracking-wide text-tic-muted">
                  <span className="flex items-center justify-between gap-2">
                    <span>{column.label}</span>
                    {column.custom ? (
                      <button type="button" className="rounded p-1 text-tic-red hover:bg-tic-red/10" onClick={() => removeCustomColumn(group.id, column.key)} aria-label={`Remove ${column.label} column`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="sticky left-0 z-10 border border-slate-200 bg-white px-2 py-2 font-bold text-tic-navy">
                  <span className="flex items-center justify-between gap-2">
                    <span>{rowIndex + 1}</span>
                    {rows.length > 1 ? (
                      <button type="button" className="rounded p-1 text-tic-red hover:bg-tic-red/10" onClick={() => removeSampleRow(rowIndex)} aria-label={`Remove worksheet row ${rowIndex + 1}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </span>
                </td>
                {activeColumns.map((column) => (
                  <td key={column.key} className="border border-slate-200 bg-white p-1">
                    {column.inputType === "select" ? (
                      <select
                        className="h-9 w-full rounded border border-slate-200 px-2 text-sm outline-none focus:border-tic-green focus:ring-2 focus:ring-tic-green/15"
                        value={row[column.key] ?? ""}
                        onChange={(event) => updateSampleRow(rowIndex, column.key, event.target.value)}
                      >
                        {(column.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : (
                      <input
                        className="h-9 w-full rounded border border-slate-200 px-2 text-sm outline-none focus:border-tic-green focus:ring-2 focus:ring-tic-green/15"
                        type={column.inputType === "number" ? "number" : column.inputType === "date" ? "date" : "text"}
                        value={row[column.key] ?? ""}
                        onChange={(event) => updateSampleRow(rowIndex, column.key, event.target.value)}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-tic-muted">Use the tabs to move across the same worksheet sections: information, measurements, package, quality defects, condition defects, and scoring.</p>
    </div>
  );
}

function ReportTablesPreview({ tables }: { tables: ClosedReportTable[] }) {
  return (
    <div className="space-y-4">
      {tables.map((table) => (
        <section key={table.title} className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <h5 className="bg-tic-navy px-3 py-2 text-xs font-bold uppercase tracking-wide text-white">{table.title}</h5>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  {table.columns.map((column) => (
                    <th key={column} className="border border-slate-200 bg-slate-100 px-2 py-2 text-left text-xs font-bold uppercase tracking-wide text-tic-muted">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIndex) => {
                  const evidence = table.rowEvidence?.[rowIndex] ?? [];
                  return (
                    <Fragment key={`${table.title}-${rowIndex}`}>
                      <tr>
                        {table.columns.map((column, columnIndex) => (
                          <td key={`${column}-${columnIndex}`} className="border border-slate-200 px-2 py-2 align-top text-slate-700">
                            {row[columnIndex] ?? ""}
                          </td>
                        ))}
                      </tr>
                      {evidence.length ? (
                        <tr>
                          <td colSpan={table.columns.length} className="border border-slate-200 bg-slate-50 p-3">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-tic-muted">Evidence captured with this result</p>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {evidence.map((image, imageIndex) => (
                                <figure key={`${image.name}-${imageIndex}`} className="overflow-hidden rounded-md border border-slate-200 bg-white">
                                  <img src={image.dataUrl} alt={`Inspection evidence: ${image.description}`} className="h-40 w-full object-contain bg-white" />
                                  <figcaption className="px-2 py-2 text-xs text-tic-muted">
                                    <span className="block truncate font-semibold text-tic-navy">{image.name}</span>
                                    <span className="mt-1 block text-slate-600">{image.description}</span>
                                  </figcaption>
                                </figure>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

export function GeneratedReportsPanel({
  request,
  mode,
  onClosedReportAction
}: {
  request: InspectionRequestRow;
  mode: WorkflowMode;
  onClosedReportAction: (requestId: string, action: ClosedReportAction) => void;
}) {
  const isSupervisorView = mode === "admin" || mode === "supervisor";
  const portalAudience: ReportAudience = mode === "farmer" ? "farmer" : mode === "inspector" ? "inspector" : "supervisor";
  const [reportAudience, setReportAudience] = useState<ReportAudience>(portalAudience);
  const [sections, setSections] = useState<ClosedReportSections>({
    summary: true,
    standard: true,
    requestNotes: true,
    fieldNotes: true,
    evidence: true,
    gps: true,
    rejectionHistory: false
  });
  const [releaseNotice, setReleaseNotice] = useState<string | null>(null);
  const [releaseConfirmation, setReleaseConfirmation] = useState<string | null>(null);
  const releaseKey = (audience: ReportAudience) => `tic-released-report-${request.id}-${audience}`;
  const releasedConfig = isSupervisorView ? null : readReleasedReportConfig(releaseKey(portalAudience));
  const effectiveAudience = isSupervisorView ? reportAudience : portalAudience;
  const effectiveSections = isSupervisorView ? sections : releasedConfig?.sections;
  const toggle = (key: keyof ClosedReportSections) => setSections((current) => ({ ...current, [key]: !current[key] }));
  const reportTables = effectiveSections ? ensureReportTables(buildClosedReportTables(request, effectiveAudience, effectiveSections), request, effectiveAudience) : [];
  const reportTitle = `${effectiveAudience === "supervisor" ? "Supervisor" : effectiveAudience === "inspector" ? "Inspector" : "Client"} Closed Inspection Report`;
  const publishReport = () => {
    if (reportAudience === "supervisor") {
      setReleaseNotice("Supervisor copy stays internal. Choose Client or Inspector before publishing to a portal.");
      return;
    }
    window.localStorage.setItem(releaseKey(reportAudience), JSON.stringify({ sections, publishedAt: new Date().toISOString() } satisfies ReleasedReportConfig));
    const recipient = reportAudience === "farmer" ? request.clientName : request.inspectorName ?? "the assigned inspector";
    const message = `${reportAudience === "farmer" ? "Client" : "Inspector"} report sent successfully to ${recipient}.`;
    setReleaseNotice(message);
    setReleaseConfirmation(message);
  };
  const confirmClosedReportAction = (action: ClosedReportAction) => {
    const verb = action === "delete" ? "delete" : "archive";
    const confirmed = window.confirm(`Are you sure you want to ${verb} this closed inspection report from this view?`);
    if (confirmed) {
      onClosedReportAction(request.id, action);
    }
  };

  return (
    <div className="closed-report-print rounded-md border border-tic-green/20 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-tic-muted">Closed inspection report</p>
          <h4 className="mt-1 text-sm font-bold text-tic-navy">{reportTitle}</h4>
        </div>
        {isSupervisorView ? <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1 print:hidden">
          {(["supervisor", "inspector", "farmer"] as const).map((audience) => (
            <button
              key={audience}
              type="button"
              className={`rounded px-2 py-1 text-xs font-bold capitalize ${reportAudience === audience ? "bg-white text-tic-green shadow-sm" : "text-tic-muted"}`}
              onClick={() => {
                setReportAudience(audience);
                setReleaseNotice(null);
              }}
            >
              {audience === "farmer" ? "client" : audience}
            </button>
          ))}
        </div> : null}
      </div>
      {isSupervisorView ? <div className="mt-3 grid gap-2 sm:grid-cols-2 print:hidden">
        {Object.entries(sections).map(([key, value]) => (
          <label key={key} className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input type="checkbox" checked={value} onChange={() => toggle(key as keyof ClosedReportSections)} className="h-4 w-4 rounded border-slate-300 text-tic-green focus:ring-tic-green" />
            Include {key.replace(/([A-Z])/g, " $1").toLowerCase()}
          </label>
        ))}
      </div> : null}
      {isSupervisorView ? (
        <div className="mt-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 print:hidden sm:grid-cols-[1fr_auto] sm:items-center">
          <p className="text-xs text-tic-muted">Publish the selected copy to the chosen role portal. Client and inspector users cannot see unreleased supervisor/internal sections.</p>
          <Button type="button" variant="secondary" onClick={publishReport} disabled={reportAudience === "supervisor"}>
            Send {reportAudience === "farmer" ? "Client" : reportAudience === "inspector" ? "Inspector" : "Role"} Report
          </Button>
          {releaseNotice ? <p className="text-xs font-semibold text-tic-green sm:col-span-2">{releaseNotice}</p> : null}
        </div>
      ) : null}
      {!isSupervisorView && !releasedConfig ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Final report is pending supervisor release. It will appear here after the supervisor selects the report sections and sends it to your portal.
        </div>
      ) : null}
      {effectiveSections ? (
        <>
      <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
        {effectiveSections.summary ? <p><strong>{effectiveAudience === "supervisor" ? "Supervisor" : effectiveAudience === "inspector" ? "Inspector" : "Client"} report:</strong> {request.farmName} · {request.classification} · {request.status}</p> : null}
        {effectiveSections.standard ? <p className="mt-1">Standard: {request.standardName ?? "Not selected"} · Form: {request.formName ?? "Not selected"}</p> : null}
        {effectiveSections.fieldNotes ? <p className="mt-1">Inspection details: {request.notes ?? "No request notes available"}</p> : null}
        {effectiveSections.evidence ? <p className="mt-1">Evidence: attached image names and inspector observations included when submitted.</p> : null}
        {effectiveSections.gps ? <p className="mt-1">GPS: included from farm request or inspector field capture where available.</p> : null}
      </div>
      <div className="mt-3 rounded-md border border-slate-200 p-3 text-sm text-slate-700">
            <ReportTablesPreview tables={reportTables} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3 print:hidden">
            <Button type="button" variant="secondary" onClick={() => downloadExcelReport(request, effectiveAudience, reportTables)}>
          Export Excel
        </Button>
        <Button type="button" variant="secondary" onClick={() => downloadCsvReport(request, effectiveAudience, reportTables)}>
          Export CSV
        </Button>
            <Button type="button" variant="secondary" onClick={() => printClosedReport(reportTitle, reportTables)}>
          Print / Save PDF
        </Button>
      </div>
        </>
      ) : null}
      {isSupervisorView ? <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-2 print:hidden">
        <Button type="button" variant="secondary" onClick={() => confirmClosedReportAction("archive")}>
          Archive Closed Report
        </Button>
        <Button type="button" variant="secondary" onClick={() => confirmClosedReportAction("delete")}>
          Delete Closed Report
        </Button>
      </div> : null}
      {releaseConfirmation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 print:hidden" role="presentation">
          <div className="w-full max-w-sm rounded-md bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="report-release-title" aria-describedby="report-release-description">
            <CheckCircle2 className="h-10 w-10 text-tic-green" aria-hidden="true" />
            <h3 id="report-release-title" className="mt-4 text-lg font-bold text-tic-navy">Report sent</h3>
            <p id="report-release-description" className="mt-2 text-sm text-slate-600">{releaseConfirmation}</p>
            <Button type="button" className="mt-5 w-full" onClick={() => setReleaseConfirmation(null)} autoFocus>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type ClosedReportSections = {
  summary: boolean;
  standard: boolean;
  requestNotes: boolean;
  fieldNotes: boolean;
  evidence: boolean;
  gps: boolean;
  rejectionHistory: boolean;
};

type ClosedReportTable = {
  title: string;
  columns: string[];
  rows: string[][];
  rowEvidence?: Record<number, ReportImage[]>;
};
type ReportImage = {
  name: string;
  dataUrl: string;
  description: string;
};

function buildClosedReportTables(request: InspectionRequestRow, audience: "supervisor" | "inspector" | "farmer", sections: ClosedReportSections): ClosedReportTable[] {
  const tables: ClosedReportTable[] = [];
  const inspectorReport = request.inspectorNotes ?? "No approved inspector report capture available.";
  const reportParts = parseReportParts(inspectorReport);
  if (sections.summary) {
    tables.push({
      title: "Report Summary",
      columns: ["Field", "Details"],
      rows: [
        ["Report Audience", audience],
        ["Site", request.farmName],
        ["Client", request.clientName],
        ["Client Type", designationLabel(request.designation)],
        ["Classification", request.classification],
        ["Inspection Type", request.inspectionType],
        ["Preferred Date", request.preferredDate ?? "Not set"],
        ["Status", request.status]
      ]
    });
  }
  if (sections.standard) {
    tables.push({
      title: "Standard and Assignment",
      columns: ["Field", "Details"],
      rows: [
        ["Standard", request.standardName ?? "Not selected"],
        ["Form", request.formName ?? "Not selected"],
        ["Inspector", request.inspectorName ?? "Not assigned"]
      ]
    });
  }
  if (sections.requestNotes) {
    tables.push({
      title: "Client Service Request",
      columns: ["Field", "Details"],
      rows: [
        ["Service", codeLabel(request.serviceRequest)],
        ["Site", request.farmName],
        ["Site Type", codeLabel(request.siteType)],
        ["Location", `${request.siteCounty}${request.siteSubCounty ? `, ${request.siteSubCounty}` : ""}`],
        ["Site GPS", request.siteLatitude != null && request.siteLongitude != null ? `${request.siteLatitude}, ${request.siteLongitude}` : "Not captured"],
        ["Product", request.product ?? "Not provided"],
        ["Specialization / Type", request.productSpecializations.length ? request.productSpecializations.join(", ") : "Not selected"],
        ["Packaging", request.packagingType ?? "Not provided"],
        ["Atmosphere", codeLabel(request.atmosphereType)],
        ["Inspection Unit", codeLabel(request.inspectionUnit)],
        ["Crates per Pallet", String(request.unitsPerPallet ?? 0)],
        ["Pallets", String(request.palletCount ?? 0)],
        ["Total Units", String(request.totalUnits ?? 0)],
        ["Estimated Packed Weight", `${request.totalWeightKg ?? 0} kg`],
        ["Inspection Date", request.preferredDate ?? "Not set"],
        ["Consignee / Receiver", request.consignee ?? "Not provided"],
        ["Optional Requirements", request.optionalRequirements.length ? request.optionalRequirements.join(", ") : "None selected"]
      ]
    });
  }
  if (sections.fieldNotes) {
    if (isActualInspectionCapture(request.inspectionCapture)) {
      const capture = request.inspectionCapture;
      tables.push({
        title: "Environment and Equipment Readings",
        columns: ["Measurement", "Actual Result", "Evidence Photos"],
        rows: [
          ["Cold Room Temperature", capture.coldRoomTemperature.notApplicable ? "Not applicable" : `${capture.coldRoomTemperature.value} °C`, String(capture.coldRoomTemperature.photos.length)],
          ["Empty Crate Weight", `${capture.emptyCrateWeight.value} kg`, String(capture.emptyCrateWeight.photos.length)]
        ],
        rowEvidence: sections.evidence ? {
          0: capture.coldRoomTemperature.photos.map(inspectionPhotoForReport),
          1: capture.emptyCrateWeight.photos.map(inspectionPhotoForReport)
        } : undefined
      });
      tables.push({
        title: "Individual Pallet Temperatures",
        columns: ["Pallet", "Actual Temperature", "Evidence Photos"],
        rows: capture.palletTemperatures.map((sample) => [sample.palletNumber, `${sample.temperature} °C`, String(sample.photos.length)]),
        rowEvidence: sections.evidence
          ? Object.fromEntries(capture.palletTemperatures.map((sample, index) => [index, sample.photos.map(inspectionPhotoForReport)]))
          : undefined
      });
      capture.palletSamples.forEach((sample, index) => {
        tables.push({
          title: `Pallet Sample ${index + 1} - ${sample.palletNumber || "Unnumbered pallet"}`,
          columns: ["Measurement", "Actual Result"],
          rows: [
            ["Pallet Number", sample.palletNumber],
            ["Sample Crate Weight", `${sample.crateWeight.value} kg`],
            ["Fruit Size", sample.fruitSize.value],
            ["Fruit Count", sample.count],
            ["Defects Observed", sample.defects],
            ["General Appearance", sample.appearance],
            ["Internal Fruit Examination", sample.insideFruitNotes],
            ["Individual Fruit Weights", sample.insideFruitPhotos.map((photo, photoIndex) => `Fruit ${photoIndex + 1}: ${photo.actualWeightGrams ? `${photo.actualWeightGrams} g` : "Not recorded"}`).join("; ")]
          ],
          rowEvidence: sections.evidence ? {
            1: sample.crateWeight.photos.map(inspectionPhotoForReport),
            2: sample.fruitSize.photos.map(inspectionPhotoForReport),
            4: sample.defectPhotos.map(inspectionPhotoForReport),
            5: sample.appearancePhotos.map(inspectionPhotoForReport),
            6: sample.insideFruitPhotos.map(inspectionPhotoForReport)
          } : undefined
        });
      });
      const extraRows = capture.extraRows ?? [];
      if (extraRows.length) {
        tables.push({
          title: "Additional Inspection Measurements",
          columns: ["Measurement", "Actual Result", "Inspector Notes", "Evidence Photos"],
          rows: extraRows.map((row) => [
            row.label || "Unlabelled measurement",
            `${row.value}${row.unit ? ` ${row.unit}` : ""}`,
            row.notes || "No additional notes",
            String(row.photos.length)
          ]),
          rowEvidence: sections.evidence
            ? Object.fromEntries(extraRows.map((row, index) => [index, row.photos.map(inspectionPhotoForReport)]))
            : undefined
        });
      }
    }
    const worksheetHeader = parseKeyValueList(reportParts["Avocado worksheet header"]);
    if (worksheetHeader.length) {
      tables.push({ title: "Avocado Worksheet Header", columns: ["Field", "Captured Value"], rows: worksheetHeader });
    }
    const sampleRows = parseSampleMatrix(reportParts["Avocado sample matrix"]);
    if (sampleRows.length) {
      tables.push({
        title: "Sample Inspection Matrix",
        columns: ["Sample", "Count", "Grower", "Variety", "Net Weight", "Temperature", "Score", "Decision", "Key Defects"],
        rows: sampleRows
      });
      tables.push({
        title: "Final Score Summary",
        columns: ["Classification", "Percentage"],
        rows: summarizeSampleScores(sampleRows)
      });
    }
    const checklistRows = parseKeyValueList(reportParts["Standard checklist"]);
    if (checklistRows.length) {
      tables.push({ title: "Standard Checklist", columns: ["Checkpoint", "Captured Result"], rows: checklistRows });
    }
    tables.push({ title: "Inspector Notes", columns: ["Field", "Details"], rows: [["Inspector Notes", reportParts["Inspector notes"] ?? "No inspector notes captured."]] });
  }
  if (sections.evidence) {
    const additionalImages = parseImageEvidence(reportParts["Image evidence"]);
    const images = sections.fieldNotes ? additionalImages : reportImagesFor(request);
    if (images.length) {
      tables.push({
        title: sections.fieldNotes ? "Additional Field Evidence" : "Inspection Evidence",
        columns: ["Evidence", "Brief Description"],
        rows: images.map((image, index) => [`Photo ${index + 1}: ${image.name}`, image.description || `Inspection evidence photo ${index + 1}`]),
        rowEvidence: Object.fromEntries(images.map((image, index) => [index, [image]]))
      });
    }
  }
  if (sections.gps) {
    tables.push({ title: "GPS", columns: ["Field", "Details"], rows: [["Field GPS", reportParts["Field GPS"] ?? extractReportPart(request.notes ?? "", "GPS") ?? "No GPS captured."]] });
  }
  const extraFields = parseKeyValueList(reportParts["Extra client fields"]);
  if (extraFields.length) {
    tables.push({ title: "Extra Client Fields", columns: ["Field", "Captured Value"], rows: extraFields });
  }
  if (sections.rejectionHistory) {
    tables.push({ title: "Review History", columns: ["Field", "Details"], rows: [["Latest Rejection Reason", request.rejectionReason ?? "No rejection reason on the closed report."]] });
  }
  return tables;
}

function ensureReportTables(tables: ClosedReportTable[], request: InspectionRequestRow, audience: ReportAudience): ClosedReportTable[] {
  if (tables.length) return tables;
  return [{
    title: "Closed Inspection Report",
    columns: ["Field", "Details"],
    rows: [
      ["Report Audience", audience],
      ["Site", request.farmName],
      ["Client", request.clientName],
      ["Classification", request.classification],
      ["Inspection Type", request.inspectionType],
      ["Preferred Date", request.preferredDate ?? "Not set"],
      ["Status", request.status],
      ["Standard", request.standardName ?? "Not selected"],
      ["Form", request.formName ?? "Not selected"],
      ["Inspector", request.inspectorName ?? "Not assigned"],
      ["Request Notes", request.notes ?? "No request notes available."]
    ]
  }];
}

function extractReportPart(source: string, label: string) {
  return source
    .split(" | ")
    .find((part) => part.toLowerCase().startsWith(`${label.toLowerCase()}:`))
    ?.replace(new RegExp(`^${label}:\\s*`, "i"), "");
}

function mergeSupervisorNotesIntoReport(source: string, supervisorNotes: string) {
  const parts = source
    .split(" | ")
    .filter((part) => part && !part.toLowerCase().startsWith("supervisor notes:"));
  return [...parts, `Supervisor notes: ${supervisorNotes.trim()}`].join(" | ");
}

function readReleasedReportConfig(key: string): ReleasedReportConfig | null {
  const stored = window.localStorage.getItem(key);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as Partial<ReleasedReportConfig>;
    return parsed.sections && parsed.publishedAt ? { sections: parsed.sections, publishedAt: parsed.publishedAt } : null;
  } catch {
    return null;
  }
}

function parseReportParts(report: string) {
  return report.split(" | ").reduce<Record<string, string>>((parts, segment) => {
    const separator = segment.indexOf(": ");
    if (separator > -1) {
      parts[segment.slice(0, separator)] = segment.slice(separator + 2);
    }
    return parts;
  }, {});
}

function parseKeyValueList(value?: string) {
  if (!value || value === "None") return [];
  return value.split("; ").map((item) => {
    const separator = item.indexOf(": ");
    return separator > -1 ? [item.slice(0, separator), item.slice(separator + 2)] : [item, ""];
  });
}

function parseSampleMatrix(value?: string) {
  if (!value) return [];
  return value.split("; ").map((sample) => {
    const sampleNumber = sample.match(/^Sample\s+([^:]+):/)?.[1] ?? "";
    const details = sample.replace(/^Sample\s+[^:]+:\s*/, "");
    const fields = details.split(", ").reduce<Record<string, string>>((current, item) => {
      const [key, ...rest] = item.split("=");
      current[key] = rest.join("=");
      return current;
    }, {});
    const defectText = details.match(/defects\((.*)\)$/)?.[1] ?? "";
    return [
      sampleNumber,
      fields.count ?? "",
      fields.grower ?? "",
      fields.variety ?? "",
      fields.netWeight ?? "",
      fields.temp ?? "",
      fields.score ?? "",
      fields.decision ?? "",
      defectText
    ];
  });
}

function summarizeSampleScores(rows: string[][]) {
  const buckets = { Excellent: 0, Good: 0, Fair: 0, Poor: 0, Bad: 0 };
  rows.forEach((row) => {
    const score = Number.parseFloat(row[6] ?? "");
    const decision = (row[7] ?? "").toLowerCase();
    if (Number.isFinite(score)) {
      if (score >= 9) buckets.Excellent += 1;
      else if (score >= 7) buckets.Good += 1;
      else if (score >= 5) buckets.Fair += 1;
      else if (score > 0) buckets.Poor += 1;
      else buckets.Bad += 1;
      return;
    }
    if (decision.includes("pass")) buckets.Good += 1;
    else if (decision.includes("hold")) buckets.Fair += 1;
    else if (decision.includes("reject")) buckets.Bad += 1;
  });
  const total = Object.values(buckets).reduce((sum, value) => sum + value, 0);
  if (!total) return [["Excellent", "0.00%"], ["Good", "0.00%"], ["Fair", "0.00%"], ["Poor", "0.00%"], ["Bad", "0.00%"]];
  return Object.entries(buckets).map(([label, count]) => [label, `${((count / total) * 100).toFixed(2)}%`]);
}

function parseImageEvidence(value?: string): ReportImage[] {
  if (!value || value === "[]") return [];
  try {
    const parsed = JSON.parse(value) as Array<Partial<ReportImage>>;
    return parsed
      .filter((item): item is Partial<ReportImage> & Pick<ReportImage, "name" | "dataUrl"> => Boolean(item.name?.trim() && item.dataUrl?.startsWith("data:image/")))
      .map((item, index) => ({
        name: item.name,
        dataUrl: item.dataUrl,
        description: item.description?.trim() || suggestImageDescription(item.name, index + 1)
      }));
  } catch {
    return [];
  }
}

function inspectionPhotoForReport(photo: InspectionPhoto): ReportImage {
  return {
    name: photo.name,
    dataUrl: photo.dataUrl,
    description: photo.actualWeightGrams
      ? `${photo.description} Individual fruit weight: ${photo.actualWeightGrams} g.`
      : photo.description
  };
}

function reportImagesFor(request: InspectionRequestRow): ReportImage[] {
  const structuredImages = isActualInspectionCapture(request.inspectionCapture)
    ? collectActualInspectionPhotos(request.inspectionCapture).map(inspectionPhotoForReport)
    : [];
  const embeddedImages = parseImageEvidence(parseReportParts(request.inspectorNotes ?? "")["Image evidence"]);
  const seen = new Set<string>();
  return [...structuredImages, ...embeddedImages].filter((image) => {
    const key = `${image.name}:${image.dataUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function reportFileName(request: InspectionRequestRow, audience: string, extension: string) {
  const safeFarm = request.farmName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${safeFarm || "inspection"}-${request.classification.toLowerCase()}-${audience}-closed-report.${extension}`;
}

function downloadExcelReport(request: InspectionRequestRow, audience: ReportAudience, tables: ClosedReportTable[]) {
  const safeTables = ensureReportTables(tables, request, audience);
  const safeSectionsHtml = safeTables.map((table) => `
    <tr><td class="section-title" colspan="${Math.max(table.columns.length, 2)}">${escapeHtml(table.title)}</td></tr>
    <tr>${table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>
    ${table.rows.map((row, rowIndex) => {
      const evidence = table.rowEvidence?.[rowIndex] ?? [];
      const evidenceRow = evidence.length
        ? `<tr><td class="evidence-cell" colspan="${Math.max(table.columns.length, 2)}"><div class="evidence-grid">${evidence.map((image) => `<div class="evidence-item"><img src="${escapeHtml(image.dataUrl)}" alt="${escapeHtml(image.description)}"/><p><strong>${escapeHtml(image.name)}</strong><br/>${escapeHtml(image.description)}</p></div>`).join("")}</div></td></tr>`
        : "";
      return `<tr>${table.columns.map((_, index) => `<td>${escapeHtml(row[index] ?? "")}</td>`).join("")}</tr>${evidenceRow}`;
    }).join("")}
    <tr><td colspan="${Math.max(table.columns.length, 2)}"></td></tr>
  `).join("");
  const workbookHtml = `<html><head><meta charset="utf-8" /><style>body{font-family:Arial,sans-serif}table{border-collapse:collapse;width:100%}.title{background:#0A1628;color:#FFFFFF;font-size:18px;font-weight:bold}.subtitle{background:#1F6B4E;color:#FFFFFF;font-weight:bold}.section-title{background:#D9EAD3;color:#0A1628;font-weight:bold;font-size:14px}th{background:#F7F8FA;font-weight:bold}td,th{border:1px solid #B7C4D2;padding:6px;vertical-align:top;white-space:normal}.evidence-cell{background:#F7F8FA;padding:10px}.evidence-grid{display:flex;flex-wrap:wrap;gap:10px}.evidence-item{width:240px;border:1px solid #B7C4D2;background:#FFFFFF;padding:6px}.evidence-item img{display:block;width:220px;height:150px;object-fit:contain}.evidence-item p{margin:5px 0 0;font-size:10px}</style></head><body><table><tr><td class="title" colspan="9">TIC Kenya Closed Inspection Report</td></tr><tr><td class="subtitle" colspan="9">${escapeHtml(audience.toUpperCase())} COPY - ${escapeHtml(request.farmName)} - ${escapeHtml(request.classification)}</td></tr><tr><td colspan="9"></td></tr>${safeSectionsHtml}</table></body></html>`;
  downloadBlob(workbookHtml, reportFileName(request, audience, "xls"), "application/vnd.ms-excel;charset=utf-8");
}

function downloadCsvReport(request: InspectionRequestRow, audience: "supervisor" | "inspector" | "farmer", tables: ClosedReportTable[]) {
  const csvRows = [["Section", "Column", "Value"]];
  tables.forEach((table) => {
    table.rows.forEach((row, rowIndex) => {
      table.columns.forEach((column, index) => {
        csvRows.push([table.title, column, row[index] ?? ""]);
      });
      const evidence = table.rowEvidence?.[rowIndex] ?? [];
      if (evidence.length) {
        csvRows.push([table.title, "Evidence", evidence.map((image) => `${image.name}: ${image.description}`).join("; ")]);
      }
    });
  });
  const csv = csvRows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  downloadBlob(csv, reportFileName(request, audience, "csv"), "text/csv;charset=utf-8");
}

function printClosedReport(title: string, tables: ClosedReportTable[]) {
  const sectionHtml = tables.map((table) => `
    <section class="report-section">
      <h2>${escapeHtml(table.title)}</h2>
      <table>
        <thead><tr>${table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
        <tbody>${table.rows.map((row, rowIndex) => {
          const evidence = table.rowEvidence?.[rowIndex] ?? [];
          const evidenceRow = evidence.length
            ? `<tr class="evidence-row"><td colspan="${table.columns.length}"><p class="evidence-label">Evidence captured with this result</p><div class="evidence-grid">${evidence.map((image) => `<figure><img src="${escapeHtml(image.dataUrl)}" alt="${escapeHtml(image.description)}"/><figcaption><strong>${escapeHtml(image.name)}</strong><br/>${escapeHtml(image.description)}</figcaption></figure>`).join("")}</div></td></tr>`
            : "";
          return `<tr>${table.columns.map((_, index) => `<td>${escapeHtml(row[index] ?? "")}</td>`).join("")}</tr>${evidenceRow}`;
        }).join("")}</tbody>
      </table>
    </section>
  `).join("");
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!printWindow) {
    window.print();
    return;
  }
  printWindow.document.write(`<html><head><title>${escapeHtml(title)}</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Inter,Arial,sans-serif;color:#0A1628;margin:0;background:#fff;font-size:11px;line-height:1.35}.report-header{border-bottom:2px solid #1F6B4E;margin-bottom:14px;padding-bottom:10px}.report-header h1{font-size:20px;margin:0 0 4px}.report-header p{margin:0;color:#526174}.report-section{margin:0 0 12px}.report-section h2{background:#0A1628;color:#fff;font-size:12px;margin:0;padding:7px 9px;text-transform:uppercase;letter-spacing:.04em}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{border:1px solid #D8E1EA;padding:6px;vertical-align:top;overflow-wrap:anywhere;white-space:pre-wrap}th{background:#F7F8FA;color:#0A1628;text-align:left;font-weight:700}.evidence-row td{background:#F7F8FA;padding:8px}.evidence-label{color:#526174;font-size:9px;font-weight:700;margin:0 0 6px;text-transform:uppercase}.evidence-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.evidence-grid figure{break-inside:avoid;margin:0;border:1px solid #D8E1EA;background:#FFFFFF}.evidence-grid img{display:block;width:100%;height:170px;object-fit:contain;background:#FFFFFF}.evidence-grid figcaption{padding:5px;font-size:10px;color:#526174}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.report-section h2{break-after:avoid}.evidence-row,.evidence-grid figure{page-break-inside:avoid}}</style></head><body><header class="report-header"><h1>${escapeHtml(title)}</h1><p>TIC Kenya - Closed Inspection Report</p></header>${sectionHtml}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function downloadBlob(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-tic-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-tic-navy">{value}</dd>
    </div>
  );
}

