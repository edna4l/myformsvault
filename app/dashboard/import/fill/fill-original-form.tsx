"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { PDFDocument } from "pdf-lib";

import {
  fillProfileDescriptors,
  resolveFillProfileKey,
} from "@/lib/fill-profile-fields";
import type { OriginalFillPlacementKind } from "@/lib/document-fill";
import type { OriginalFormLayoutOption } from "@/lib/original-form-layouts";

export type FillOriginalMemberOption = {
  autofillValues: Record<string, string>;
  id: string;
  fullName: string;
  householdName: string;
  relationship: string | null;
};

type PdfFieldOption = {
  id: string;
  name: string;
  kind: string;
  selectedKey: string;
  suggestedKey: string;
};

type PlacementOption = {
  kind: OriginalFillPlacementKind;
  id: string;
  profileKey: string;
  x: number;
  y: number;
  pageIndex: number;
  fontSize: number;
  width: number;
  height: number;
};

type SourceKind = "none" | "pdf" | "image";
type LayoutSaveMode = "create" | "update";
type PlacementTool = OriginalFillPlacementKind;

type FilledPdfPreview = {
  bytes: Uint8Array;
  fileName: string;
  filledCount: string;
  layoutAction: string | null;
  totalFields: string;
  url: string;
};

type OriginalFilePreview = {
  fileName: string;
  kind: SourceKind;
  url: string;
};

type PreviewSurface = "filled" | "original";

type FillOriginalFormProps = {
  familyMembers: FillOriginalMemberOption[];
  profilesUnavailable: boolean;
  savedLayouts: OriginalFormLayoutOption[];
  uploadLimitLabel: string;
};

type PdfJsPage = {
  getViewport: (options: { scale: number }) => { height: number; width: number };
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { height: number; width: number };
  }) => { promise: Promise<void> };
};

type PdfJsDocument = {
  destroy?: () => Promise<void>;
  getPage: (pageNumber: number) => Promise<PdfJsPage>;
  numPages: number;
};

type PdfJsModule = {
  getDocument: (options: { data: Uint8Array }) => { promise: Promise<PdfJsDocument> };
};

const DEFAULT_HIGHLIGHT_HEIGHT = 0.035;
const DEFAULT_HIGHLIGHT_WIDTH = 0.18;
const DEFAULT_MARK_SIZE = 16;
const DEFAULT_MARK_SPAN = 0.03;
const DEFAULT_TEXT_SIZE = 11;

const placementTools: Array<{ id: PlacementTool; label: string }> = [
  { id: "text", label: "Text" },
  { id: "check", label: "Check" },
  { id: "x", label: "X" },
  { id: "highlight", label: "Highlight" },
];

function getPdfFieldKind(field: unknown) {
  const constructorName =
    (field as { constructor?: { name?: string } }).constructor?.name?.replace(/^PDF/, "") || "Field";

  return constructorName.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function getPdfFieldId(fieldName: string, index: number) {
  const safeName = fieldName.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return `pdf-field-${index}-${safeName || "field"}`;
}

function getClientOriginalKind(file: File): SourceKind {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    fileType === "image/png" ||
    fileType === "image/jpeg" ||
    fileType === "image/jpg" ||
    fileName.endsWith(".png") ||
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg")
  ) {
    return "image";
  }

  return "none";
}

function getDescriptorLabel(profileKey: string) {
  return fillProfileDescriptors.find((descriptor) => descriptor.key === profileKey)?.label ?? "Vault detail";
}

function getAutofillValue(member: FillOriginalMemberOption | undefined, profileKey: string) {
  return member?.autofillValues[profileKey]?.trim() ?? "";
}

function truncateValue(value: string) {
  return value.length > 42 ? `${value.slice(0, 39)}...` : value;
}

function getDescriptorOptionLabel(profileKey: string, member: FillOriginalMemberOption | undefined) {
  const value = getAutofillValue(member, profileKey);

  return value ? `${getDescriptorLabel(profileKey)} - ${truncateValue(value)}` : `${getDescriptorLabel(profileKey)} - no saved value`;
}

function getPlacementPreviewLabel(profileKey: string, member: FillOriginalMemberOption | undefined) {
  const value = getAutofillValue(member, profileKey);

  if (!member) {
    return `${getDescriptorLabel(profileKey)}: choose profile`;
  }

  return value ? `${getDescriptorLabel(profileKey)}: ${truncateValue(value)}` : `${getDescriptorLabel(profileKey)}: no saved value`;
}

function getPlacementKind(value: unknown): PlacementTool {
  if (value === "check" || value === "highlight" || value === "x") {
    return value;
  }

  return "text";
}

function getPlacementKindLabel(kind: PlacementTool) {
  if (kind === "check") {
    return "Check mark";
  }

  if (kind === "x") {
    return "X mark";
  }

  if (kind === "highlight") {
    return "Highlight";
  }

  return "Vault text";
}

function getPlacementMarkerLabel(placement: PlacementOption, member: FillOriginalMemberOption | undefined) {
  if (placement.kind === "check") {
    return "Check mark";
  }

  if (placement.kind === "x") {
    return "X mark";
  }

  if (placement.kind === "highlight") {
    return "Highlight";
  }

  return getPlacementPreviewLabel(placement.profileKey, member);
}

function getPlacementValueLabel(placement: PlacementOption, member: FillOriginalMemberOption | undefined) {
  if (placement.kind !== "text") {
    return getPlacementKindLabel(placement.kind);
  }

  return getAutofillValue(member, placement.profileKey) || "No saved value for this detail yet.";
}

function createPlacementId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getLayoutSourceKindLabel(sourceKind: string) {
  if (sourceKind === "pdf") {
    return "PDF";
  }

  if (sourceKind === "png") {
    return "PNG";
  }

  if (sourceKind === "jpg") {
    return "JPG";
  }

  return "Original";
}

function getDownloadFilename(contentDisposition: string | null) {
  const match = contentDisposition?.match(/filename="([^"]+)"/i);

  return match?.[1] ?? "filled-form.pdf";
}

function clampPageIndex(pageIndex: number, pageCount: number) {
  const maxPageIndex = Math.max(pageCount - 1, 0);
  const nextPageIndex = Number.isFinite(pageIndex) ? Math.trunc(pageIndex) : 0;

  return Math.min(Math.max(nextPageIndex, 0), maxPageIndex);
}

function clampPlacementCoordinate(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function clampPlacementSize(value: number, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, 0.01), 1);
}

function clampFontSize(value: number, kind: PlacementTool) {
  const parsed = Number(value);
  const fallback = kind === "text" ? DEFAULT_TEXT_SIZE : DEFAULT_MARK_SIZE;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return kind === "text" ? Math.min(Math.max(parsed, 7), 28) : Math.min(Math.max(parsed, 8), 36);
}

function clonePlacements(placementList: PlacementOption[]) {
  return placementList.map((placement) => ({ ...placement }));
}

function withPlacementIds(layout: OriginalFormLayoutOption): PlacementOption[] {
  return layout.placements.map((placement) => {
    const kind = getPlacementKind(placement.kind);

    return {
      fontSize: clampFontSize(placement.fontSize ?? (kind === "text" ? DEFAULT_TEXT_SIZE : DEFAULT_MARK_SIZE), kind),
      height: clampPlacementSize(
        placement.height ?? (kind === "highlight" ? DEFAULT_HIGHLIGHT_HEIGHT : DEFAULT_MARK_SPAN),
        kind === "highlight" ? DEFAULT_HIGHLIGHT_HEIGHT : DEFAULT_MARK_SPAN,
      ),
      id: createPlacementId(),
      kind,
      pageIndex: placement.pageIndex ?? 0,
      profileKey: placement.profileKey ?? fillProfileDescriptors[0]?.key ?? "",
      width: clampPlacementSize(
        placement.width ?? (kind === "highlight" ? DEFAULT_HIGHLIGHT_WIDTH : DEFAULT_MARK_SPAN),
        kind === "highlight" ? DEFAULT_HIGHLIGHT_WIDTH : DEFAULT_MARK_SPAN,
      ),
      x: placement.x,
      y: placement.y,
    };
  });
}

export function FillOriginalForm({
  familyMembers,
  profilesUnavailable,
  savedLayouts,
  uploadLimitLabel,
}: FillOriginalFormProps) {
  const filledPdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const filledPreviewRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const placementDragOffsetRef = useRef<{
    historyRecorded: boolean;
    id: string;
    surface: PreviewSurface;
    x: number;
    y: number;
  } | null>(null);
  const placementHistoryRef = useRef<PlacementOption[][]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const [activeProfileKey, setActiveProfileKey] = useState(fillProfileDescriptors[0]?.key ?? "");
  const [activePlacementTool, setActivePlacementTool] = useState<PlacementTool>("text");
  const [availableLayouts, setAvailableLayouts] = useState(savedLayouts);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [inspectMessage, setInspectMessage] = useState<string | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isDeletingLayout, setIsDeletingLayout] = useState(false);
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [pdfFields, setPdfFields] = useState<PdfFieldOption[]>([]);
  const [pdfPageCount, setPdfPageCount] = useState(1);
  const [pdfPreviewBytes, setPdfPreviewBytes] = useState<Uint8Array | null>(null);
  const [placements, setPlacements] = useState<PlacementOption[]>([]);
  const [previewReady, setPreviewReady] = useState(false);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [saveLayout, setSaveLayout] = useState(false);
  const [layoutSaveMode, setLayoutSaveMode] = useState<LayoutSaveMode>("create");
  const [savedLayoutId, setSavedLayoutId] = useState("");
  const [layoutName, setLayoutName] = useState("");
  const [layoutDeleteMessage, setLayoutDeleteMessage] = useState<string | null>(null);
  const [originalFilePreview, setOriginalFilePreview] = useState<OriginalFilePreview | null>(null);
  const [sourceKind, setSourceKind] = useState<SourceKind>("none");
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filledPdfPreview, setFilledPdfPreview] = useState<FilledPdfPreview | null>(null);
  const [filledPreviewReady, setFilledPreviewReady] = useState(false);
  const [isFilledPreviewFullscreen, setIsFilledPreviewFullscreen] = useState(false);
  const [undoDepth, setUndoDepth] = useState(0);
  const activeMember = familyMembers.find((member) => member.id === memberId);
  const activeSavedLayout = availableLayouts.find((layout) => layout.id === savedLayoutId);
  const activeDetailValue = getAutofillValue(activeMember, activeProfileKey);
  const pageCount = sourceKind === "pdf" ? Math.max(pdfPageCount, 1) : 1;
  const activePagePlacements = placements.filter((placement) => placement.pageIndex === activePageIndex);
  const pageOptions = Array.from({ length: pageCount }, (_, index) => index);
  const selectedPlacement = placements.find((placement) => placement.id === selectedPlacementId);
  const selectedPlacementNumber = selectedPlacement
    ? placements.findIndex((placement) => placement.id === selectedPlacement.id) + 1
    : 0;

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    return () => {
      if (filledPdfPreview) {
        URL.revokeObjectURL(filledPdfPreview.url);
      }
    };
  }, [filledPdfPreview]);

  useEffect(() => {
    return () => {
      if (originalFilePreview) {
        URL.revokeObjectURL(originalFilePreview.url);
      }
    };
  }, [originalFilePreview]);

  useEffect(() => {
    setAvailableLayouts(savedLayouts);
  }, [savedLayouts]);

  useEffect(() => {
    if (!isEditorFullscreen && !isFilledPreviewFullscreen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsEditorFullscreen(false);
        setIsFilledPreviewFullscreen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditorFullscreen, isFilledPreviewFullscreen]);

  useEffect(() => {
    setActivePageIndex((current) => clampPageIndex(current, pageCount));
  }, [pageCount]);

  useEffect(() => {
    if (!pdfPreviewBytes || sourceKind !== "pdf") {
      return;
    }

    const previewBytes = pdfPreviewBytes;
    let isCancelled = false;
    let pdfDocument: PdfJsDocument | null = null;

    async function renderPdfPreview() {
      const canvas = pdfCanvasRef.current;

      if (!canvas) {
        return;
      }

      try {
        setPreviewReady(false);
        const pdfJs = (await import("pdfjs-dist/webpack.mjs")) as unknown as PdfJsModule;
        const loadingTask = pdfJs.getDocument({ data: previewBytes });
        pdfDocument = await loadingTask.promise;

        if (!isCancelled) {
          setPdfPageCount(Math.max(pdfDocument.numPages, 1));
        }

        const page = await pdfDocument.getPage(clampPageIndex(activePageIndex, pdfDocument.numPages) + 1);
        const viewport = page.getViewport({ scale: 1.45 });
        const context = canvas.getContext("2d");

        if (!context || isCancelled) {
          return;
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;

        if (!isCancelled) {
          setPreviewReady(true);
        }
      } catch {
        if (!isCancelled) {
          setInspectMessage("This PDF could not be previewed. Try a fresh copy of the original form.");
        }
      }
    }

    renderPdfPreview();

    return () => {
      isCancelled = true;
      void pdfDocument?.destroy?.();
    };
  }, [activePageIndex, pdfPreviewBytes, sourceKind]);

  useEffect(() => {
    if (!filledPdfPreview || !isFilledPreviewFullscreen) {
      return;
    }

    let isCancelled = false;
    let pdfDocument: PdfJsDocument | null = null;

    async function renderFilledPdfPreview() {
      const canvas = filledPdfCanvasRef.current;

      if (!canvas || !filledPdfPreview) {
        return;
      }

      try {
        setFilledPreviewReady(false);
        const pdfJs = (await import("pdfjs-dist/webpack.mjs")) as unknown as PdfJsModule;
        const loadingTask = pdfJs.getDocument({ data: new Uint8Array(filledPdfPreview.bytes) });
        pdfDocument = await loadingTask.promise;
        const page = await pdfDocument.getPage(clampPageIndex(activePageIndex, pdfDocument.numPages) + 1);
        const viewport = page.getViewport({ scale: 1.55 });
        const context = canvas.getContext("2d");

        if (!context || isCancelled) {
          return;
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;

        if (!isCancelled) {
          setFilledPreviewReady(true);
        }
      } catch {
        if (!isCancelled) {
          setSubmitMessage("The full screen PDF preview could not be opened. Download the PDF or regenerate it.");
        }
      }
    }

    renderFilledPdfPreview();

    return () => {
      isCancelled = true;
      void pdfDocument?.destroy?.();
    };
  }, [activePageIndex, filledPdfPreview, isFilledPreviewFullscreen]);

  async function inspectPdf(fileBuffer: ArrayBuffer, fieldMappings: Record<string, string>) {
    const pdfDoc = await PDFDocument.load(fileBuffer.slice(0));
    const pageCount = Math.max(pdfDoc.getPageCount(), 1);
    const fields = pdfDoc.getForm().getFields();

    setPdfFields(
      fields.map((field, index) => {
        const fieldName = field.getName();

        return {
          id: getPdfFieldId(fieldName, index),
          kind: getPdfFieldKind(field),
          name: fieldName,
          selectedKey: fieldMappings[fieldName] ?? resolveFillProfileKey(fieldName) ?? "",
          suggestedKey: fieldMappings[fieldName] ?? resolveFillProfileKey(fieldName) ?? "",
        };
      }),
    );

    if (fields.length > 0) {
      setInspectMessage(
        `${fields.length} fillable PDF field${fields.length === 1 ? "" : "s"} found across ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
      );
    } else {
      setInspectMessage(
        `No fillable PDF fields found. Placement mode is ready across ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
      );
    }

    return pageCount;
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setInspectMessage(null);
    setIsInspecting(false);
    setLayoutDeleteMessage(null);
    setPdfFields([]);
    setPdfPageCount(1);
    setPdfPreviewBytes(null);
    setPreviewReady(false);
    setActivePageIndex(0);
    setSelectedPlacementId(null);
    setFilledPdfPreview(null);
    setFilledPreviewReady(false);
    setIsFilledPreviewFullscreen(false);
    setOriginalFilePreview(null);
    setSourceKind("none");

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }

    if (!file) {
      return;
    }

    const nextKind = getClientOriginalKind(file);
    const selectedLayout = availableLayouts.find((layout) => layout.id === savedLayoutId);

    if (nextKind === "none") {
      setInspectMessage("Choose a PDF, PNG, or JPG original for this fill workflow.");
      return;
    }

    const originalUrl = URL.createObjectURL(file);

    setOriginalFilePreview({
      fileName: file.name,
      kind: nextKind,
      url: originalUrl,
    });
    setIsInspecting(true);
    setInspectMessage(nextKind === "pdf" ? "Inspecting PDF fields..." : "Preparing image preview...");
    setSourceKind(nextKind);

    try {
      if (nextKind === "pdf") {
        const fileBuffer = await file.arrayBuffer();
        const nextPageCount = await inspectPdf(fileBuffer, selectedLayout?.fieldMappings ?? {});
        const preferredPageIndex = selectedLayout?.placements[0]?.pageIndex ?? 0;

        setPdfPageCount(nextPageCount);
        setActivePageIndex(clampPageIndex(preferredPageIndex, nextPageCount));
        setPdfPreviewBytes(new Uint8Array(fileBuffer.slice(0)));
      } else {
        setPdfPageCount(1);
        setActivePageIndex(0);
        setImagePreviewUrl(originalUrl);
        setInspectMessage("Image original ready for placement.");
      }

      if (!layoutName.trim()) {
        setLayoutName(file.name.replace(/\.[^.]+$/, "") || "Original form layout");
      }
    } catch {
      setInspectMessage("This original could not be inspected. Try a fresh PDF, PNG, or JPG copy.");
      setSourceKind("none");
    } finally {
      setIsInspecting(false);
    }
  }

  function pushPlacementHistory(snapshot = placements) {
    placementHistoryRef.current = [...placementHistoryRef.current, clonePlacements(snapshot)].slice(-40);
    setUndoDepth(placementHistoryRef.current.length);
  }

  function resetPlacementHistory() {
    placementHistoryRef.current = [];
    setUndoDepth(0);
  }

  function undoLastPlacementEdit() {
    const previous = placementHistoryRef.current.at(-1);

    if (!previous) {
      return;
    }

    placementHistoryRef.current = placementHistoryRef.current.slice(0, -1);
    setUndoDepth(placementHistoryRef.current.length);
    setPlacements(previous);
    setSelectedPlacementId((current) => {
      if (current && previous.some((placement) => placement.id === current)) {
        return current;
      }

      const fallbackPlacement = previous.at(-1);

      if (fallbackPlacement) {
        setActivePageIndex(clampPageIndex(fallbackPlacement.pageIndex, pageCount));
        return fallbackPlacement.id;
      }

      return null;
    });
  }

  function updatePlacementsWithUndo(updater: (current: PlacementOption[]) => PlacementOption[]) {
    pushPlacementHistory();
    setPlacements((current) => updater(current));
  }

  function createPlacementFromTool(point: { x: number; y: number }): PlacementOption | null {
    const pageIndex = sourceKind === "pdf" ? activePageIndex : 0;

    if (activePlacementTool === "text") {
      if (!activeProfileKey) {
        return null;
      }

      return {
        fontSize: DEFAULT_TEXT_SIZE,
        height: DEFAULT_MARK_SPAN,
        id: createPlacementId(),
        kind: "text",
        pageIndex,
        profileKey: activeProfileKey,
        width: DEFAULT_MARK_SPAN,
        x: point.x,
        y: point.y,
      };
    }

    if (activePlacementTool === "highlight") {
      return {
        fontSize: DEFAULT_TEXT_SIZE,
        height: DEFAULT_HIGHLIGHT_HEIGHT,
        id: createPlacementId(),
        kind: "highlight",
        pageIndex,
        profileKey: "",
        width: DEFAULT_HIGHLIGHT_WIDTH,
        x: point.x,
        y: point.y,
      };
    }

    return {
      fontSize: DEFAULT_MARK_SIZE,
      height: DEFAULT_MARK_SPAN,
      id: createPlacementId(),
      kind: activePlacementTool,
      pageIndex,
      profileKey: "",
      width: DEFAULT_MARK_SPAN,
      x: point.x,
      y: point.y,
    };
  }

  function handlePlacementSurfaceClick(event: MouseEvent<HTMLDivElement>, surface: PreviewSurface) {
    const isReady = surface === "filled" ? filledPreviewReady : previewReady;

    if (!isReady || event.target instanceof HTMLButtonElement) {
      return;
    }

    const point = getPreviewPoint(surface, event.clientX, event.clientY);

    if (!point) {
      return;
    }

    const nextPlacement = createPlacementFromTool(point);

    if (!nextPlacement) {
      return;
    }

    updatePlacementsWithUndo((current) => [...current, nextPlacement]);
    setSelectedPlacementId(nextPlacement.id);
  }

  function getPreviewPoint(surface: PreviewSurface, clientX: number, clientY: number) {
    const preview = surface === "filled" ? filledPreviewRef.current : previewRef.current;

    if (!preview) {
      return null;
    }

    const rect = preview.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      return null;
    }

    return {
      x: clampPlacementCoordinate((clientX - rect.left) / rect.width),
      y: clampPlacementCoordinate((clientY - rect.top) / rect.height),
    };
  }

  function selectPlacement(id: string) {
    const placement = placements.find((item) => item.id === id);

    if (!placement) {
      return;
    }

    setSelectedPlacementId(id);
    setActivePageIndex(clampPageIndex(placement.pageIndex, pageCount));
    setActivePlacementTool(placement.kind);

    if (placement.kind === "text") {
      setActiveProfileKey(placement.profileKey);
    }
  }

  function removePlacement(id: string) {
    updatePlacementsWithUndo((current) => current.filter((placement) => placement.id !== id));
    setSelectedPlacementId((current) => (current === id ? null : current));
  }

  function updatePlacementProfile(id: string, profileKey: string) {
    updatePlacementsWithUndo((current) =>
      current.map((placement) => (placement.id === id ? { ...placement, profileKey } : placement)),
    );
    setActiveProfileKey(profileKey);
  }

  function updatePlacementFontSize(id: string, fontSize: number) {
    updatePlacementsWithUndo((current) =>
      current.map((placement) =>
        placement.id === id ? { ...placement, fontSize: clampFontSize(fontSize, placement.kind) } : placement,
      ),
    );
  }

  function updatePlacementWidth(id: string, widthPercent: number) {
    updatePlacementsWithUndo((current) =>
      current.map((placement) =>
        placement.id === id
          ? { ...placement, width: clampPlacementSize(widthPercent / 100, DEFAULT_HIGHLIGHT_WIDTH) }
          : placement,
      ),
    );
  }

  function updatePlacementHeight(id: string, heightPercent: number) {
    updatePlacementsWithUndo((current) =>
      current.map((placement) =>
        placement.id === id
          ? { ...placement, height: clampPlacementSize(heightPercent / 100, DEFAULT_HIGHLIGHT_HEIGHT) }
          : placement,
      ),
    );
  }

  function movePlacementTo(id: string, x: number, y: number) {
    setPlacements((current) =>
      current.map((placement) =>
        placement.id === id
          ? {
              ...placement,
              x: clampPlacementCoordinate(x),
              y: clampPlacementCoordinate(y),
            }
          : placement,
      ),
    );
  }

  function movePlacementBy(id: string, deltaX: number, deltaY: number) {
    updatePlacementsWithUndo((current) =>
      current.map((placement) =>
        placement.id === id
          ? {
              ...placement,
              x: clampPlacementCoordinate(placement.x + deltaX),
              y: clampPlacementCoordinate(placement.y + deltaY),
            }
          : placement,
      ),
    );
  }

  function updatePlacementPage(id: string, pageIndex: number) {
    const nextPageIndex = clampPageIndex(pageIndex, pageCount);

    updatePlacementsWithUndo((current) =>
      current.map((placement) => (placement.id === id ? { ...placement, pageIndex: nextPageIndex } : placement)),
    );
    setSelectedPlacementId(id);
    setActivePageIndex(nextPageIndex);
  }

  function goToPage(pageIndex: number) {
    const nextPageIndex = clampPageIndex(pageIndex, pageCount);

    setActivePageIndex(nextPageIndex);
    setSelectedPlacementId((current) => {
      const placement = placements.find((item) => item.id === current);

      return placement?.pageIndex === nextPageIndex ? current : null;
    });
  }

  function updatePdfFieldMapping(fieldId: string, profileKey: string) {
    setPdfFields((current) =>
      current.map((field) => (field.id === fieldId ? { ...field, selectedKey: profileKey } : field)),
    );
  }

  function applySavedLayout(layoutId: string) {
    setSavedLayoutId(layoutId);
    setLayoutDeleteMessage(null);

    if (!layoutId) {
      setLayoutSaveMode("create");
      return;
    }

    const layout = availableLayouts.find((item) => item.id === layoutId);

    if (!layout) {
      return;
    }

    const nextPlacements = withPlacementIds(layout);

    setLayoutSaveMode("update");
    setLayoutName(layout.name);
    setPlacements(nextPlacements);
    resetPlacementHistory();
    setPdfFields((current) =>
      current.map((field) => ({
        ...field,
        selectedKey: layout.fieldMappings[field.name] ?? field.selectedKey,
      })),
    );

    if (nextPlacements[0]) {
      setActivePlacementTool(nextPlacements[0].kind);

      if (nextPlacements[0].kind === "text") {
        setActiveProfileKey(nextPlacements[0].profileKey);
      }

      setSelectedPlacementId(nextPlacements[0].id);
      setActivePageIndex(clampPageIndex(nextPlacements[0].pageIndex, pageCount));
    }

    setInspectMessage(`Loaded reusable layout "${layout.name}". Upload the matching original file to generate a copy.`);
  }

  async function deleteSelectedLayout() {
    if (!activeSavedLayout || isDeletingLayout) {
      return;
    }

    const shouldDelete = window.confirm(`Delete "${activeSavedLayout.name}" from saved layouts?`);

    if (!shouldDelete) {
      return;
    }

    setIsDeletingLayout(true);
    setLayoutDeleteMessage(null);

    try {
      const response = await fetch(`/dashboard/import/fill/layouts/${encodeURIComponent(activeSavedLayout.id)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setLayoutDeleteMessage("That saved layout could not be deleted yet. Try again after refreshing.");
        return;
      }

      setAvailableLayouts((current) => current.filter((layout) => layout.id !== activeSavedLayout.id));
      setSavedLayoutId("");
      setLayoutSaveMode("create");
      setSaveLayout(false);
      setLayoutDeleteMessage(`Deleted "${activeSavedLayout.name}" from saved layouts.`);
    } catch {
      setLayoutDeleteMessage("That saved layout could not be deleted yet. Check the connection and try again.");
    } finally {
      setIsDeletingLayout(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setSubmitMessage("Generating filled PDF...");
    setFilledPdfPreview(null);
    setFilledPreviewReady(false);

    try {
      const response = await fetch("/dashboard/import/fill?response=json", {
        body: new FormData(event.currentTarget),
        headers: {
          "X-MyFormsVault-Fill-Fetch": "1",
        },
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setSubmitMessage(`Could not generate the PDF yet: ${data?.error ?? "unknown error"}.`);
        return;
      }

      const fileName = getDownloadFilename(response.headers.get("content-disposition"));
      const filledCount = response.headers.get("x-myformsvault-filled-fields") ?? "0";
      const layoutAction = response.headers.get("x-myformsvault-layout-action");
      const totalFields = response.headers.get("x-myformsvault-total-fields") ?? "0";
      const layoutMessage =
        layoutAction === "created"
          ? " Saved a new reusable layout."
          : layoutAction === "updated"
            ? " Updated the reusable layout."
            : "";
      const previewBytes = new Uint8Array(await response.arrayBuffer());
      const previewUrl = URL.createObjectURL(new Blob([previewBytes], { type: "application/pdf" }));

      setFilledPdfPreview({
        bytes: previewBytes,
        fileName,
        filledCount,
        layoutAction,
        totalFields,
        url: previewUrl,
      });
      setSubmitMessage(
        `Preview ready for ${fileName}. Filled ${filledCount} field${filledCount === "1" ? "" : "s"}.${layoutMessage}`,
      );
    } catch {
      setSubmitMessage("The filled PDF preview could not be generated. Try again after refreshing the page.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleMarkerPointerDown(
    event: PointerEvent<HTMLButtonElement>,
    placement: PlacementOption,
    surface: PreviewSurface,
  ) {
    const point = getPreviewPoint(surface, event.clientX, event.clientY);

    event.preventDefault();
    event.stopPropagation();
    setSelectedPlacementId(placement.id);

    if (!point) {
      return;
    }

    placementDragOffsetRef.current = {
      historyRecorded: false,
      id: placement.id,
      surface,
      x: placement.x - point.x,
      y: placement.y - point.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleMarkerPointerMove(event: PointerEvent<HTMLButtonElement>, placementId: string) {
    const dragOffset = placementDragOffsetRef.current;

    if (!dragOffset || dragOffset.id !== placementId) {
      return;
    }

    const point = getPreviewPoint(dragOffset.surface, event.clientX, event.clientY);

    if (!point) {
      return;
    }

    event.preventDefault();
    if (!dragOffset.historyRecorded) {
      pushPlacementHistory();
      placementDragOffsetRef.current = { ...dragOffset, historyRecorded: true };
    }

    movePlacementTo(placementId, point.x + dragOffset.x, point.y + dragOffset.y);
  }

  function handleMarkerPointerUp(event: PointerEvent<HTMLButtonElement>, placementId: string) {
    if (placementDragOffsetRef.current?.id === placementId) {
      placementDragOffsetRef.current = null;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleMarkerKeyDown(event: KeyboardEvent<HTMLButtonElement>, placementId: string) {
    const keyboardStep = event.shiftKey ? 0.01 : 0.003;

    if (event.key === "ArrowUp") {
      event.preventDefault();
      movePlacementBy(placementId, 0, -keyboardStep);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      movePlacementBy(placementId, 0, keyboardStep);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      movePlacementBy(placementId, -keyboardStep, 0);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      movePlacementBy(placementId, keyboardStep, 0);
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      removePlacement(placementId);
    }
  }

  function handleSaveLayoutChange(checked: boolean) {
    setSaveLayout(checked);

    if (checked) {
      setLayoutSaveMode(activeSavedLayout ? "update" : "create");
    }
  }

  function submitFromWorkspace() {
    formRef.current?.requestSubmit();
  }

  function renderPlacementMarker(placement: PlacementOption, surface: PreviewSurface) {
    const markerStyle: CSSProperties = {
      fontSize: `${placement.fontSize}px`,
      left: `${placement.x * 100}%`,
      top: `${placement.y * 100}%`,
    };

    if (placement.kind === "highlight") {
      markerStyle.height = `${placement.height * 100}%`;
      markerStyle.width = `${placement.width * 100}%`;
    }

    return (
      <button
        key={`${surface}-${placement.id}`}
        type="button"
        aria-label={getPlacementMarkerLabel(placement, activeMember)}
        aria-pressed={selectedPlacementId === placement.id}
        className={`placement-marker placement-marker-${placement.kind}${
          selectedPlacementId === placement.id ? " is-selected" : ""
        }`}
        style={markerStyle}
        onClick={(event) => {
          event.stopPropagation();
          selectPlacement(placement.id);
        }}
        onKeyDown={(event) => handleMarkerKeyDown(event, placement.id)}
        onPointerCancel={(event) => handleMarkerPointerUp(event, placement.id)}
        onPointerDown={(event) => handleMarkerPointerDown(event, placement, surface)}
        onPointerMove={(event) => handleMarkerPointerMove(event, placement.id)}
        onPointerUp={(event) => handleMarkerPointerUp(event, placement.id)}
        title="Select placement"
      >
        {placement.kind === "check"
          ? "✓"
          : placement.kind === "x"
            ? "X"
            : getPlacementMarkerLabel(placement, activeMember)}
      </button>
    );
  }

  const placementData = JSON.stringify(
    placements.map(({ fontSize, height, kind, pageIndex, profileKey, width, x, y }) => ({
      fontSize,
      height,
      kind,
      pageIndex,
      profileKey,
      width,
      x,
      y,
    })),
  );
  const filledPdfWorkspace =
    filledPdfPreview && isFilledPreviewFullscreen && typeof document !== "undefined"
      ? createPortal(
          <div className="filled-pdf-workspace" role="dialog" aria-modal="true" aria-label="Filled PDF editor">
            <div className="filled-pdf-workspace-header">
              <div>
                <span className="eyebrow">Filled PDF</span>
                <h2 style={{ marginTop: "0.6rem" }}>{filledPdfPreview.fileName}</h2>
              </div>
              <div className="placement-toolbar">
                <div className="placement-tool-group" aria-label="Placement tool">
                  {placementTools.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      aria-pressed={activePlacementTool === tool.id}
                      className={`placement-tool-button${activePlacementTool === tool.id ? " is-active" : ""}`}
                      onClick={() => setActivePlacementTool(tool.id)}
                    >
                      {tool.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="button button-ghost placement-toolbar-button"
                  disabled={undoDepth === 0}
                  onClick={undoLastPlacementEdit}
                >
                  Undo
                </button>
                {selectedPlacement ? (
                  <button
                    type="button"
                    className="button button-ghost placement-toolbar-button"
                    onClick={() => removePlacement(selectedPlacement.id)}
                  >
                    Remove selected
                  </button>
                ) : null}
                <button
                  type="button"
                  className="button button-secondary placement-toolbar-button"
                  disabled={isInspecting || isSubmitting}
                  onClick={submitFromWorkspace}
                >
                  {isSubmitting ? "Updating..." : "Update PDF"}
                </button>
                <a
                  className="button button-primary placement-toolbar-button"
                  href={filledPdfPreview.url}
                  download={filledPdfPreview.fileName}
                >
                  Download PDF
                </a>
                <button
                  type="button"
                  className="button button-ghost placement-toolbar-button"
                  onClick={() => setIsFilledPreviewFullscreen(false)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="placement-editor-controls">
              <label className="field placement-field-picker">
                <span>Detail to place</span>
                <select
                  disabled={activePlacementTool !== "text"}
                  value={activeProfileKey}
                  onChange={(event) => setActiveProfileKey(event.target.value)}
                >
                  {fillProfileDescriptors.map((descriptor) => (
                    <option key={descriptor.key} value={descriptor.key}>
                      {getDescriptorOptionLabel(descriptor.key, activeMember)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="placement-page-bar">
              <div className="placement-page-summary">
                <strong>
                  Page {activePageIndex + 1} of {pageCount}
                </strong>
                <span>
                  {activePagePlacements.length} placement{activePagePlacements.length === 1 ? "" : "s"} on this page ·{" "}
                  {placements.length} total
                </span>
              </div>
              <div className="placement-page-actions">
                <button
                  type="button"
                  className="button button-ghost placement-page-button"
                  disabled={activePageIndex === 0}
                  onClick={() => goToPage(activePageIndex - 1)}
                >
                  Previous
                </button>
                <label className="field placement-page-picker">
                  <span>Preview page</span>
                  <select value={activePageIndex} onChange={(event) => goToPage(Number(event.target.value))}>
                    {pageOptions.map((pageIndex) => (
                      <option key={pageIndex} value={pageIndex}>
                        Page {pageIndex + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="button button-ghost placement-page-button"
                  disabled={activePageIndex >= pageCount - 1}
                  onClick={() => goToPage(activePageIndex + 1)}
                >
                  Next
                </button>
              </div>
            </div>

            <div
              ref={filledPreviewRef}
              className={`filled-pdf-edit-preview placement-tool-${activePlacementTool}${
                filledPreviewReady ? "" : " is-loading"
              }`}
              onClick={(event) => handlePlacementSurfaceClick(event, "filled")}
            >
              <canvas ref={filledPdfCanvasRef} />
              {activePagePlacements.map((placement) => renderPlacementMarker(placement, "filled"))}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div>
        <span className="eyebrow">Step 1</span>
        <h2 style={{ marginTop: "0.85rem" }}>Choose the saved profile</h2>
        <p style={{ marginTop: "0.6rem" }}>
          Pick the person whose vault details should be inserted into the original document.
        </p>
      </div>

      {profilesUnavailable ? (
        <div className="empty-state">
          <strong>Saved profiles are temporarily unavailable</strong>
          <p>The original document can still be uploaded once the database connection responds.</p>
          <div className="button-row">
            <Link href="/dashboard/import?method=fill" className="button button-secondary">
              Retry profiles
            </Link>
          </div>
        </div>
      ) : familyMembers.length > 0 ? (
        <form
          ref={formRef}
          encType="multipart/form-data"
          className="form-grid"
          onSubmit={handleSubmit}
        >
          <input type="hidden" name="layoutId" value={savedLayoutId} />
          <input type="hidden" name="layoutSaveMode" value={layoutSaveMode} />
          <input type="hidden" name="placementData" value={placementData} />
          {availableLayouts.length > 0 ? (
            <label className="field field-full">
              <span>Reuse saved layout</span>
              <select value={savedLayoutId} onChange={(event) => applySavedLayout(event.target.value)}>
                <option value="">Start without a saved layout</option>
                {availableLayouts.map((layout) => (
                  <option key={layout.id} value={layout.id}>
                    {layout.name} · {getLayoutSourceKindLabel(layout.sourceKind)} · {layout.sourceFileName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {activeSavedLayout ? (
            <div className="field-full layout-delete-panel">
              <div>
                <strong>{activeSavedLayout.name}</strong>
                <p className="list-copy">
                  {getLayoutSourceKindLabel(activeSavedLayout.sourceKind)} · {activeSavedLayout.sourceFileName}
                </p>
              </div>
              <button
                type="button"
                className="button button-danger"
                disabled={isDeletingLayout}
                onClick={deleteSelectedLayout}
              >
                {isDeletingLayout ? "Deleting..." : "Delete saved layout"}
              </button>
            </div>
          ) : null}
          {layoutDeleteMessage ? <div className="notice field-full">{layoutDeleteMessage}</div> : null}
          <label className="field field-full">
            <span>Saved family profile</span>
            <select
              name="memberId"
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
            >
              <option value="">Choose a profile</option>
              {familyMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName} · {member.householdName}
                  {member.relationship ? ` · ${member.relationship}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="field field-full">
            <span>Original PDF or image</span>
            <input
              name="sourceFile"
              type="file"
              accept="application/pdf,.pdf,image/png,image/jpeg,.png,.jpg,.jpeg"
              required
              onChange={handleFileChange}
            />
          </label>
          <p className="list-copy">
            Uploads currently support up to {uploadLimitLabel} per file.
          </p>

          {originalFilePreview ? (
            <div className="field-full original-preview-panel">
              <div>
                <span className="eyebrow">Original file</span>
                <h2 style={{ marginTop: "0.65rem" }}>{originalFilePreview.fileName}</h2>
                <p className="list-copy">
                  Open or download the blank original before placing any saved information.
                </p>
              </div>
              <div className="button-row original-preview-actions">
                <a
                  className="button button-secondary"
                  href={originalFilePreview.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open original
                </a>
                <a className="button button-ghost" href={originalFilePreview.url} download={originalFilePreview.fileName}>
                  Download original
                </a>
              </div>
            </div>
          ) : null}

          <div className="field-full layout-save-panel">
            <label className="checkbox-field">
              <input
                name="saveLayout"
                type="checkbox"
                value="1"
                checked={saveLayout}
                onChange={(event) => handleSaveLayoutChange(event.target.checked)}
              />
              <span>{activeSavedLayout ? "Save reusable layout changes" : "Save this field layout for reuse"}</span>
            </label>
            {saveLayout ? (
              <>
                {activeSavedLayout ? (
                  <label className="field">
                    <span>Save behavior</span>
                    <select
                      value={layoutSaveMode}
                      onChange={(event) => setLayoutSaveMode(event.target.value as LayoutSaveMode)}
                    >
                      <option value="update">Update selected layout</option>
                      <option value="create">Save as a new layout</option>
                    </select>
                  </label>
                ) : null}
                <label className="field">
                  <span>Layout name</span>
                  <input
                    name="layoutName"
                    type="text"
                    value={layoutName}
                    maxLength={90}
                    onChange={(event) => setLayoutName(event.target.value)}
                    placeholder="School enrollment packet"
                    required
                  />
                </label>
              </>
            ) : null}
            <p className="list-copy">
              Saved layouts keep field matches, pages, placement coordinates, and text sizes for reuse.
            </p>
          </div>

          {inspectMessage ? (
            <div className="notice field-full">{isInspecting ? "Inspecting original..." : inspectMessage}</div>
          ) : null}

          {submitMessage ? <div className="notice field-full">{submitMessage}</div> : null}

          {filledPdfPreview ? (
            <div className="field-full filled-preview-panel">
              <div className="filled-preview-header">
                <div>
                  <span className="eyebrow">Filled PDF</span>
                  <h2 style={{ marginTop: "0.85rem" }}>{filledPdfPreview.fileName}</h2>
                </div>
                <div className="button-row filled-preview-actions">
                  <a className="button button-primary" href={filledPdfPreview.url} download={filledPdfPreview.fileName}>
                    Download PDF
                  </a>
                  <button
                    type="button"
                    className="button button-ghost"
                    onClick={() => {
                      setFilledPreviewReady(false);
                      setIsFilledPreviewFullscreen(true);
                    }}
                  >
                    Open PDF
                  </button>
                </div>
              </div>
              <div className="filled-preview-meta">
                <span className="status-pill">
                  Filled {filledPdfPreview.filledCount} of {filledPdfPreview.totalFields}
                </span>
                {filledPdfPreview.layoutAction === "created" ? (
                  <span className="status-pill status-ready">Layout saved</span>
                ) : null}
                {filledPdfPreview.layoutAction === "updated" ? (
                  <span className="status-pill status-ready">Layout updated</span>
                ) : null}
              </div>
              <iframe
                className="filled-pdf-frame"
                src={`${filledPdfPreview.url}#toolbar=1&navpanes=0`}
                title={`Filled PDF preview: ${filledPdfPreview.fileName}`}
              />
            </div>
          ) : null}

          {pdfFields.length > 0 ? (
            <div className="field-full pdf-field-map">
              <div>
                <span className="eyebrow">Step 2</span>
                <h2 style={{ marginTop: "0.85rem" }}>Match original fields</h2>
                <p style={{ marginTop: "0.6rem" }}>
                  Suggested matches are selected when the PDF field name is recognizable.
                </p>
              </div>
              <div className="pdf-field-map-list">
                {pdfFields.map((field) => (
                  <div key={`${field.id}-${field.suggestedKey}`} className="pdf-field-map-row">
                    <input type="hidden" name="pdfFieldName" value={field.name} />
                    <div className="pdf-field-name">
                      <strong>{field.name}</strong>
                      <span className="status-pill">{field.kind}</span>
                    </div>
                    <label className="field">
                      <span>Vault detail</span>
                      <select
                        name="profileKey"
                        value={field.selectedKey}
                        onChange={(event) => updatePdfFieldMapping(field.id, event.target.value)}
                      >
                        <option value="">Auto match</option>
                        {fillProfileDescriptors.map((descriptor) => (
                          <option key={descriptor.key} value={descriptor.key}>
                            {getDescriptorOptionLabel(descriptor.key, activeMember)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {sourceKind !== "none" ? (
            <div className={`field-full placement-editor${isEditorFullscreen ? " is-fullscreen" : ""}`}>
              <div className="placement-editor-top">
                <div>
                  <span className="eyebrow">Placement</span>
                  <h2 style={{ marginTop: "0.85rem" }}>Place text, marks, and highlights</h2>
                </div>
                <div className="placement-toolbar">
                  <div className="placement-tool-group" aria-label="Placement tool">
                    {placementTools.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        aria-pressed={activePlacementTool === tool.id}
                        className={`placement-tool-button${activePlacementTool === tool.id ? " is-active" : ""}`}
                        onClick={() => setActivePlacementTool(tool.id)}
                      >
                        {tool.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="button button-ghost placement-toolbar-button"
                    disabled={undoDepth === 0}
                    onClick={undoLastPlacementEdit}
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    className="button button-secondary placement-toolbar-button"
                    onClick={() => setIsEditorFullscreen((current) => !current)}
                  >
                    {isEditorFullscreen ? "Exit full screen" : "Full screen"}
                  </button>
                </div>
              </div>
              <div className="placement-editor-controls">
                <label className="field placement-field-picker">
                  <span>Detail to place</span>
                  <select
                    disabled={activePlacementTool !== "text"}
                    value={activeProfileKey}
                    onChange={(event) => setActiveProfileKey(event.target.value)}
                  >
                    {fillProfileDescriptors.map((descriptor) => (
                      <option key={descriptor.key} value={descriptor.key}>
                        {getDescriptorOptionLabel(descriptor.key, activeMember)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className={`list-copy${activePlacementTool !== "text" || activeDetailValue ? "" : " warning-copy"}`}>
                {activePlacementTool === "text"
                  ? memberId
                    ? activeDetailValue
                      ? `This will insert: ${activeDetailValue}`
                      : "That detail is empty for the selected profile. Add it in the vault or choose a detail with a saved value."
                    : "Choose a saved family profile so the editor can show the values that will be inserted."
                  : `${getPlacementKindLabel(activePlacementTool)} placement active.`}
              </p>

              {sourceKind === "pdf" ? (
                <div className="placement-page-bar">
                  <div className="placement-page-summary">
                    <strong>
                      Page {activePageIndex + 1} of {pageCount}
                    </strong>
                    <span>
                      {activePagePlacements.length} placement{activePagePlacements.length === 1 ? "" : "s"} on this
                      page · {placements.length} total
                    </span>
                  </div>
                  <div className="placement-page-actions">
                    <button
                      type="button"
                      className="button button-ghost placement-page-button"
                      disabled={activePageIndex === 0}
                      onClick={() => goToPage(activePageIndex - 1)}
                    >
                      Previous
                    </button>
                    <label className="field placement-page-picker">
                      <span>Preview page</span>
                      <select
                        value={activePageIndex}
                        onChange={(event) => goToPage(Number(event.target.value))}
                      >
                        {pageOptions.map((pageIndex) => (
                          <option key={pageIndex} value={pageIndex}>
                            Page {pageIndex + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="button button-ghost placement-page-button"
                      disabled={activePageIndex >= pageCount - 1}
                      onClick={() => goToPage(activePageIndex + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}

              <div
                ref={previewRef}
                className={`placement-preview placement-tool-${activePlacementTool}${previewReady ? "" : " is-loading"}`}
                onClick={(event) => handlePlacementSurfaceClick(event, "original")}
              >
                {sourceKind === "pdf" ? <canvas ref={pdfCanvasRef} /> : null}
                {sourceKind === "image" && imagePreviewUrl ? (
                  // Blob previews cannot use next/image because they are local object URLs.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagePreviewUrl} alt="Uploaded original form preview" onLoad={() => setPreviewReady(true)} />
                ) : null}
                {activePagePlacements.map((placement) => renderPlacementMarker(placement, "original"))}
              </div>

              {selectedPlacement ? (
                <div className="placement-adjust-panel">
                  <div className="placement-adjust-summary">
                    <strong>
                      Placement {selectedPlacementNumber} · {getPlacementKindLabel(selectedPlacement.kind)} · Page{" "}
                      {selectedPlacement.pageIndex + 1}
                    </strong>
                    <span>
                      X {(selectedPlacement.x * 100).toFixed(1)}% · Y {(selectedPlacement.y * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="placement-nudge-controls" aria-label="Adjust selected placement">
                    <button
                      type="button"
                      className="button button-ghost placement-nudge-button placement-nudge-up"
                      onClick={() => movePlacementBy(selectedPlacement.id, 0, -0.003)}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="button button-ghost placement-nudge-button"
                      onClick={() => movePlacementBy(selectedPlacement.id, -0.003, 0)}
                    >
                      Left
                    </button>
                    <button
                      type="button"
                      className="button button-ghost placement-nudge-button"
                      onClick={() => movePlacementBy(selectedPlacement.id, 0, 0.003)}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      className="button button-ghost placement-nudge-button"
                      onClick={() => movePlacementBy(selectedPlacement.id, 0.003, 0)}
                    >
                      Right
                    </button>
                  </div>
                  <button type="button" className="button button-ghost" onClick={() => removePlacement(selectedPlacement.id)}>
                    Remove selected
                  </button>
                </div>
              ) : null}

              {placements.length > 0 ? (
                <div className="placement-list">
                  {placements.map((placement, index) => (
                    <div
                      key={placement.id}
                      className={`placement-list-row${selectedPlacementId === placement.id ? " is-selected" : ""}`}
                      onClick={() => selectPlacement(placement.id)}
                      onFocusCapture={() => selectPlacement(placement.id)}
                    >
                      <strong className="placement-list-heading">
                        Placement {index + 1}
                        <span className="status-pill">{getPlacementKindLabel(placement.kind)}</span>
                        {sourceKind === "pdf" ? <span className="status-pill">Page {placement.pageIndex + 1}</span> : null}
                      </strong>
                      {sourceKind === "pdf" ? (
                        <label className="field">
                          <span>Page</span>
                          <select
                            value={placement.pageIndex}
                            onChange={(event) => updatePlacementPage(placement.id, Number(event.target.value))}
                          >
                            {pageOptions.map((pageIndex) => (
                              <option key={pageIndex} value={pageIndex}>
                                Page {pageIndex + 1}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      {placement.kind === "text" ? (
                        <label className="field">
                          <span>Vault detail</span>
                          <select
                            value={placement.profileKey}
                            onChange={(event) => updatePlacementProfile(placement.id, event.target.value)}
                          >
                            {fillProfileDescriptors.map((descriptor) => (
                              <option key={descriptor.key} value={descriptor.key}>
                                {getDescriptorOptionLabel(descriptor.key, activeMember)}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      {placement.kind !== "highlight" ? (
                        <label className="field">
                          <span>{placement.kind === "text" ? "Text size" : "Mark size"}</span>
                          <input
                            type="number"
                            min={placement.kind === "text" ? "7" : "8"}
                            max={placement.kind === "text" ? "28" : "36"}
                            step="1"
                            value={placement.fontSize}
                            onChange={(event) => updatePlacementFontSize(placement.id, Number(event.target.value))}
                          />
                        </label>
                      ) : (
                        <>
                          <label className="field">
                            <span>Width %</span>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              step="1"
                              value={Math.round(placement.width * 100)}
                              onChange={(event) => updatePlacementWidth(placement.id, Number(event.target.value))}
                            />
                          </label>
                          <label className="field">
                            <span>Height %</span>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              step="1"
                              value={Math.round(placement.height * 100)}
                              onChange={(event) => updatePlacementHeight(placement.id, Number(event.target.value))}
                            />
                          </label>
                        </>
                      )}
                      <button type="button" className="button button-ghost" onClick={() => removePlacement(placement.id)}>
                        Remove
                      </button>
                      <p className="list-copy">{getPlacementValueLabel(placement, activeMember)}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="field-full button-row">
            <button type="submit" className="button button-primary" disabled={isInspecting || isSubmitting}>
              {isSubmitting ? "Generating..." : "Generate filled PDF"}
            </button>
            <Link href="/dashboard/vault" className="button button-ghost">
              Manage vault profiles
            </Link>
          </div>
        </form>
      ) : (
        <div className="empty-state">
          <strong>No saved profiles yet</strong>
          <p>Add a family member before generating a filled original document.</p>
          <div className="button-row">
            <Link href="/dashboard/vault" className="button button-secondary">
              Open family vault
            </Link>
          </div>
        </div>
      )}
      {filledPdfWorkspace}
    </>
  );
}
