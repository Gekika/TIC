import { ExternalLink, FileText, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";

export type InspectionPhoto = {
  id: string;
  name: string;
  dataUrl: string;
  description: string;
  actualWeightGrams?: string;
};

export type EvidenceReading = {
  value: string;
  notApplicable: boolean;
  photos: InspectionPhoto[];
};

export type PalletTemperatureCapture = {
  id: string;
  palletNumber: string;
  temperature: string;
  photos: InspectionPhoto[];
};

export type PalletSampleCapture = {
  id: string;
  palletNumber: string;
  crateWeight: EvidenceReading;
  fruitSize: EvidenceReading;
  count: string;
  defects: string;
  defectPhotos: InspectionPhoto[];
  appearance: string;
  appearancePhotos: InspectionPhoto[];
  insideFruitNotes: string;
  insideFruitPhotos: InspectionPhoto[];
};

export type ExtraInspectionRow = {
  id: string;
  label: string;
  value: string;
  unit: string;
  notes: string;
  photos: InspectionPhoto[];
};

export type ActualInspectionCapture = {
  version: 1;
  coldRoomTemperature: EvidenceReading;
  palletTemperatures: PalletTemperatureCapture[];
  emptyCrateWeight: EvidenceReading;
  palletSamples: PalletSampleCapture[];
  extraRows?: ExtraInspectionRow[];
};

type ManualResource = {
  title: string;
  href: string;
};

const qualityAssessmentManuals: ManualResource[] = [
  { title: "Quality and Condition Assessment Checklist", href: "/manuals/quality-condition-assessment-checklist.pdf" },
  { title: "Quality and Condition Assessment SOP", href: "/manuals/quality-condition-assessment-sop.pdf" }
];

const manualLibrary: Record<string, ManualResource[]> = {
  avocado: [
    { title: "Avocado Inspection Manual CU - Version 2", href: "/manuals/avocado-inspection-manual-v2.pdf" },
    ...qualityAssessmentManuals
  ],
  apple: [
    { title: "Apple Inspection Manual CU - Version 2", href: "/manuals/apple-inspection-manual-v2.pdf" },
    ...qualityAssessmentManuals
  ],
  asparagus: [
    { title: "Asparagus Inspection Manual CU", href: "/manuals/asparagus-inspection-manual.pdf" },
    ...qualityAssessmentManuals
  ]
};
const noManuals: ManualResource[] = [];

function emptyReading(): EvidenceReading {
  return { value: "", notApplicable: false, photos: [] };
}

function emptyPalletTemperature(): PalletTemperatureCapture {
  return { id: crypto.randomUUID(), palletNumber: "", temperature: "", photos: [] };
}

function emptyPalletSample(): PalletSampleCapture {
  return {
    id: crypto.randomUUID(),
    palletNumber: "",
    crateWeight: emptyReading(),
    fruitSize: emptyReading(),
    count: "",
    defects: "",
    defectPhotos: [],
    appearance: "",
    appearancePhotos: [],
    insideFruitNotes: "",
    insideFruitPhotos: []
  };
}

export function createEmptyActualInspectionCapture(): ActualInspectionCapture {
  return {
    version: 1,
    coldRoomTemperature: emptyReading(),
    palletTemperatures: [emptyPalletTemperature()],
    emptyCrateWeight: emptyReading(),
    palletSamples: [emptyPalletSample()],
    extraRows: []
  };
}

export function isActualInspectionCapture(value: unknown): value is ActualInspectionCapture {
  if (!value || typeof value !== "object") return false;
  const capture = value as Partial<ActualInspectionCapture>;
  return capture.version === 1
    && Boolean(capture.coldRoomTemperature)
    && Array.isArray(capture.palletTemperatures)
    && Boolean(capture.emptyCrateWeight)
    && Array.isArray(capture.palletSamples);
}

export function collectActualInspectionPhotos(capture: ActualInspectionCapture) {
  return [
    ...capture.coldRoomTemperature.photos,
    ...capture.palletTemperatures.flatMap((sample) => sample.photos),
    ...capture.emptyCrateWeight.photos,
    ...(capture.extraRows ?? []).flatMap((row) => row.photos),
    ...capture.palletSamples.flatMap((sample) => [
      ...sample.crateWeight.photos,
      ...sample.fruitSize.photos,
      ...sample.defectPhotos,
      ...sample.appearancePhotos,
      ...sample.insideFruitPhotos
    ])
  ];
}

export function requiredInsideFruitPhotos(packagingType: string | null) {
  if (packagingType?.toUpperCase().startsWith("10KG")) return 10;
  if (packagingType?.toUpperCase().startsWith("4KG")) return 4;
  return 1;
}

export function validateActualInspectionCapture(capture: ActualInspectionCapture, packagingType: string | null) {
  if (!capture.coldRoomTemperature.notApplicable && (!capture.coldRoomTemperature.value.trim() || !capture.coldRoomTemperature.photos.length)) {
    return "Capture the actual cold-room temperature and at least one picture of the reading, or mark it not applicable.";
  }
  if (!capture.palletTemperatures.length) return "Add at least one individual pallet temperature reading.";
  const incompleteTemperature = capture.palletTemperatures.find((sample) => !sample.palletNumber.trim() || !sample.temperature.trim() || !sample.photos.length);
  if (incompleteTemperature) return "Complete every pallet temperature row with a pallet number, actual temperature, and picture evidence.";
  if (!capture.emptyCrateWeight.value.trim() || !capture.emptyCrateWeight.photos.length) {
    return "Capture the empty crate weight and at least one picture of the scale reading.";
  }
  if (!capture.palletSamples.length) return "Add at least one pallet inspection sample.";
  const insideMinimum = requiredInsideFruitPhotos(packagingType);
  for (const [index, sample] of capture.palletSamples.entries()) {
    const label = `Pallet sample ${index + 1}`;
    if (!sample.palletNumber.trim()) return `${label}: enter the pallet number.`;
    if (!sample.crateWeight.value.trim() || !sample.crateWeight.photos.length) return `${label}: capture sample crate weight and picture evidence.`;
    if (!sample.fruitSize.value.trim() || !sample.fruitSize.photos.length) return `${label}: capture fruit size and picture evidence.`;
    if (!sample.count.trim()) return `${label}: enter the inspected fruit count.`;
    if (!sample.defects.trim() || !sample.defectPhotos.length) return `${label}: record the observed defects and picture evidence.`;
    if (!sample.appearance || !sample.appearancePhotos.length) return `${label}: record general appearance and picture evidence.`;
    if (!sample.insideFruitNotes.trim()) return `${label}: add notes for the internal fruit examination.`;
    if (sample.insideFruitPhotos.length < insideMinimum) {
      return `${label}: add at least ${insideMinimum} internal fruit pictures for the selected packaging. Extra pictures are allowed.`;
    }
    if (sample.insideFruitPhotos.slice(0, insideMinimum).some((photo) => !photo.actualWeightGrams?.trim())) {
      return `${label}: enter the individual fruit weight for each of the ${insideMinimum} required internal-fruit pictures.`;
    }
  }
  return null;
}

export function CropManualPanel({ product }: { product: string | null }) {
  const productKey = Object.keys(manualLibrary).find((key) => product?.trim().toLowerCase().includes(key)) ?? "";
  const manuals = manualLibrary[productKey] ?? noManuals;
  const [selectedManual, setSelectedManual] = useState(manuals[0]?.href ?? "");
  const activeManual = manuals.find((manual) => manual.href === selectedManual) ?? manuals[0];

  useEffect(() => {
    setSelectedManual(manuals[0]?.href ?? "");
  }, [manuals]);

  if (!manuals.length) {
    return (
      <section className="border-t border-slate-200 py-5">
        <p className="text-xs font-bold uppercase tracking-wide text-tic-muted">Crop inspection manual</p>
        <p className="mt-2 text-sm text-slate-600">No PDF manual has been uploaded for {product || "this product"}.</p>
      </section>
    );
  }

  return (
    <section className="border-t border-slate-200 py-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-tic-muted">Crop inspection manual</p>
          <h4 className="mt-1 font-bold text-tic-navy">Reference material for {product}</h4>
        </div>
        <a href={activeManual.href} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-tic-navy hover:bg-slate-50">
          <ExternalLink className="h-4 w-4" /> Open full screen
        </a>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label={`${product} inspection manuals`}>
        {manuals.map((manual) => (
          <button
            key={manual.href}
            type="button"
            role="tab"
            aria-selected={activeManual.href === manual.href}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${activeManual.href === manual.href ? "border-tic-green bg-tic-green/5 text-tic-green" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setSelectedManual(manual.href)}
          >
            <FileText className="h-4 w-4" /> {manual.title}
          </button>
        ))}
      </div>
      <div className="mt-3 overflow-hidden border border-slate-200 bg-slate-50">
        <iframe title={activeManual.title} src={activeManual.href} className="h-[32rem] w-full" />
      </div>
    </section>
  );
}

export function ActualInspectionForm({
  capture,
  packagingType,
  onChange
}: {
  capture: ActualInspectionCapture;
  packagingType: string | null;
  onChange: (capture: ActualInspectionCapture) => void;
}) {
  const insideMinimum = requiredInsideFruitPhotos(packagingType);
  const updatePalletTemperature = (id: string, changes: Partial<PalletTemperatureCapture>) => {
    onChange({ ...capture, palletTemperatures: capture.palletTemperatures.map((sample) => sample.id === id ? { ...sample, ...changes } : sample) });
  };
  const updatePalletSample = (id: string, changes: Partial<PalletSampleCapture>) => {
    onChange({ ...capture, palletSamples: capture.palletSamples.map((sample) => sample.id === id ? { ...sample, ...changes } : sample) });
  };

  return (
    <section className="border-t border-slate-200 py-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-tic-muted">Actual inspection</p>
        <h4 className="mt-1 text-lg font-bold text-tic-navy">Measurements, pallet samples, and picture evidence</h4>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <EvidenceReadingControl
          label="Cold room temperature"
          hint="Record the actual ambient/cold-room temperature."
          unit="°C"
          reading={capture.coldRoomTemperature}
          allowNotApplicable
          onChange={(coldRoomTemperature) => onChange({ ...capture, coldRoomTemperature })}
        />
        <EvidenceReadingControl
          label="Empty crate weight"
          hint="Weigh an empty crate before calculating product net weight."
          unit="kg"
          reading={capture.emptyCrateWeight}
          onChange={(emptyCrateWeight) => onChange({ ...capture, emptyCrateWeight })}
        />
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h5 className="font-bold text-tic-navy">Individual pallet temperatures</h5>
            <p className="mt-1 text-sm text-slate-600">Take as many representative pallet readings as required.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => onChange({ ...capture, palletTemperatures: [...capture.palletTemperatures, emptyPalletTemperature()] })}>
            <Plus className="h-4 w-4" /> Add temperature row
          </Button>
        </div>
        <div className="mt-4 space-y-4">
          {capture.palletTemperatures.map((sample, index) => (
            <div key={sample.id} className="border-l-2 border-tic-green bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-tic-navy">Temperature sample {index + 1}</p>
                {capture.palletTemperatures.length > 1 ? (
                  <button type="button" className="rounded p-1.5 text-tic-red hover:bg-tic-red/10" onClick={() => onChange({ ...capture, palletTemperatures: capture.palletTemperatures.filter((item) => item.id !== sample.id) })} aria-label={`Remove temperature sample ${index + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Pallet number"><Input value={sample.palletNumber} onChange={(event) => updatePalletTemperature(sample.id, { palletNumber: event.target.value })} /></Field>
                <Field label="Actual temperature (°C)"><Input type="number" step="0.01" value={sample.temperature} onChange={(event) => updatePalletTemperature(sample.id, { temperature: event.target.value })} /></Field>
              </div>
              <PhotoEvidenceControl
                className="mt-3"
                label="Picture evidence of temperature reading"
                context={`Pallet ${sample.palletNumber || index + 1} temperature reading`}
                photos={sample.photos}
                onChange={(photos) => updatePalletTemperature(sample.id, { photos })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h5 className="font-bold text-tic-navy">Pallet inspection samples</h5>
            <p className="mt-1 text-sm text-slate-600">Record actual measurements and supporting pictures for every sampled pallet.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => onChange({ ...capture, palletSamples: [...capture.palletSamples, emptyPalletSample()] })}>
            <Plus className="h-4 w-4" /> Add pallet row
          </Button>
        </div>
        <div className="mt-4 space-y-6">
          {capture.palletSamples.map((sample, index) => (
            <article key={sample.id} className="border-l-2 border-tic-green bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h6 className="font-bold text-tic-navy">Pallet sample {index + 1}</h6>
                {capture.palletSamples.length > 1 ? (
                  <button type="button" className="rounded p-1.5 text-tic-red hover:bg-tic-red/10" onClick={() => onChange({ ...capture, palletSamples: capture.palletSamples.filter((item) => item.id !== sample.id) })} aria-label={`Remove pallet sample ${index + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <div className="mt-4">
                <Field label="Pallet number"><Input value={sample.palletNumber} onChange={(event) => updatePalletSample(sample.id, { palletNumber: event.target.value })} /></Field>
              </div>
              <div className="mt-4 grid gap-5 xl:grid-cols-2">
                <EvidenceReadingControl label="Sample crate weight" hint="Record the actual gross sample-crate weight." unit="kg" reading={sample.crateWeight} onChange={(crateWeight) => updatePalletSample(sample.id, { crateWeight })} />
                <EvidenceReadingControl label="Fruit size" hint="Record size code, dimensions, or individual weight." unit="actual" reading={sample.fruitSize} onChange={(fruitSize) => updatePalletSample(sample.id, { fruitSize })} />
              </div>
              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                <div>
                  <Field label="Fruit count"><Input type="number" min="0" value={sample.count} onChange={(event) => updatePalletSample(sample.id, { count: event.target.value })} /></Field>
                </div>
                <div>
                  <Field label="General appearance">
                    <select className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={sample.appearance} onChange={(event) => updatePalletSample(sample.id, { appearance: event.target.value })}>
                      <option value="">Select observed appearance</option>
                      <option value="Very good">Very good</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                      <option value="Very poor">Very poor</option>
                    </select>
                  </Field>
                  <PhotoEvidenceControl className="mt-3" label="Appearance pictures" context={`Pallet ${sample.palletNumber || index + 1} general appearance`} photos={sample.appearancePhotos} onChange={(appearancePhotos) => updatePalletSample(sample.id, { appearancePhotos })} />
                </div>
              </div>
              <div className="mt-5">
                <Field label="Defects observed">
                  <textarea className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-tic-green focus:ring-2 focus:ring-tic-green/15" placeholder="Record defect type, fruits examined, fruits affected, severity, percentage, and observations. Enter 'None observed' where applicable." value={sample.defects} onChange={(event) => updatePalletSample(sample.id, { defects: event.target.value })} />
                </Field>
                <PhotoEvidenceControl className="mt-3" label="Defect pictures" context={`Pallet ${sample.palletNumber || index + 1} defect evidence`} photos={sample.defectPhotos} onChange={(defectPhotos) => updatePalletSample(sample.id, { defectPhotos })} />
              </div>
              <div className="mt-5 border-t border-slate-200 pt-5">
                <Field label="Inside of fruit - notes">
                  <textarea className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-tic-green focus:ring-2 focus:ring-tic-green/15" placeholder="Describe flesh colour, maturity, internal defects, firmness, and individual fruit weight observations." value={sample.insideFruitNotes} onChange={(event) => updatePalletSample(sample.id, { insideFruitNotes: event.target.value })} />
                </Field>
                <PhotoEvidenceControl
                  className="mt-3"
                  label={`Inside-fruit and individual-weight pictures (${sample.insideFruitPhotos.length}/${insideMinimum} minimum)`}
                  context={`Pallet ${sample.palletNumber || index + 1} internal fruit and individual weight`}
                  photos={sample.insideFruitPhotos}
                  onChange={(insideFruitPhotos) => updatePalletSample(sample.id, { insideFruitPhotos })}
                  captureIndividualWeight
                />
                <p className="mt-2 text-xs text-slate-500">The minimum follows the selected package size. Additional pictures can be added whenever the supervisor or inspection scope requires them.</p>
              </div>
            </article>
          ))}
        </div>
      </div>

    </section>
  );
}

function EvidenceReadingControl({
  label,
  hint,
  unit,
  reading,
  onChange,
  allowNotApplicable = false
}: {
  label: string;
  hint: string;
  unit: string;
  reading: EvidenceReading;
  onChange: (reading: EvidenceReading) => void;
  allowNotApplicable?: boolean;
}) {
  return (
    <div className="border-l-2 border-tic-green bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-tic-navy">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        {allowNotApplicable ? (
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input type="checkbox" checked={reading.notApplicable} onChange={(event) => onChange({ ...reading, notApplicable: event.target.checked })} /> Not applicable
          </label>
        ) : null}
      </div>
      {!reading.notApplicable ? (
        <>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input type={unit === "actual" ? "text" : "number"} step="0.01" value={reading.value} onChange={(event) => onChange({ ...reading, value: event.target.value })} />
            <span className="inline-flex min-w-16 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600">{unit}</span>
          </div>
          <PhotoEvidenceControl className="mt-3" label="Picture evidence of reading" context={label} photos={reading.photos} onChange={(photos) => onChange({ ...reading, photos })} />
        </>
      ) : null}
    </div>
  );
}

function PhotoEvidenceControl({
  label,
  context,
  photos,
  onChange,
  captureIndividualWeight = false,
  className = ""
}: {
  label: string;
  context: string;
  photos: InspectionPhoto[];
  onChange: (photos: InspectionPhoto[]) => void;
  captureIndividualWeight?: boolean;
  className?: string;
}) {
  const [processing, setProcessing] = useState(false);
  const countLabel = useMemo(() => `${photos.length} ${photos.length === 1 ? "image" : "images"}`, [photos.length]);
  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setProcessing(true);
    try {
      const additions = await Promise.all(Array.from(files).map((file, index) => resizeInspectionPhoto(file, `${context} - photo ${photos.length + index + 1}`)));
      onChange([...photos, ...additions]);
    } finally {
      setProcessing(false);
    }
  };
  return (
    <div className={className}>
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-tic-muted">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{countLabel}</p>
        </div>
        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-tic-navy hover:bg-slate-50">
          <ImagePlus className="h-4 w-4" /> {processing ? "Preparing images..." : "Add pictures"}
          <input type="file" accept="image/*" capture="environment" multiple className="sr-only" disabled={processing} onChange={(event) => { void addFiles(event.target.files); event.target.value = ""; }} />
        </label>
      </div>
      {photos.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {photos.map((photo) => (
            <figure key={photo.id} className="overflow-hidden border border-slate-200 bg-white">
              <img src={photo.dataUrl} alt={photo.description} className="h-32 w-full object-cover" />
              <figcaption className="p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-tic-navy">{photo.name}</span>
                  <button type="button" className="rounded p-1 text-tic-red hover:bg-tic-red/10" onClick={() => onChange(photos.filter((item) => item.id !== photo.id))} aria-label={`Remove ${photo.name}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea className="mt-2 min-h-16 w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-700" value={photo.description} onChange={(event) => onChange(photos.map((item) => item.id === photo.id ? { ...item, description: event.target.value } : item))} aria-label={`Description for ${photo.name}`} />
                {captureIndividualWeight ? (
                  <label className="mt-2 grid gap-1 text-xs font-semibold text-slate-600">
                    Individual fruit weight (g)
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={photo.actualWeightGrams ?? ""}
                      onChange={(event) => onChange(photos.map((item) => item.id === photo.id ? { ...item, actualWeightGrams: event.target.value } : item))}
                    />
                  </label>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-tic-muted">
      {label}
      <span className="normal-case tracking-normal text-tic-navy">{children}</span>
    </label>
  );
}

async function resizeInspectionPhoto(file: File, description: string): Promise<InspectionPhoto> {
  const source = await fileToDataUrl(file);
  const image = new window.Image();
  image.src = source;
  await image.decode();
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare inspection image");
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return {
    id: crypto.randomUUID(),
    name: file.name,
    dataUrl: canvas.toDataURL("image/jpeg", 0.82),
    description
  };
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
