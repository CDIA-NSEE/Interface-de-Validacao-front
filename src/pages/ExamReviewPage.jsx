import {
  ArrowLeft,
  ChevronDown,
  FileText,
  PanelRightOpen,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import DiagnosisPanel from "../components/DiagnosisPanel.jsx";
import EcgViewer from "../components/EcgViewer.jsx";
import EmptyState from "../components/EmptyState.jsx";
import GeneralObservations from "../components/GeneralObservations.jsx";
import KeyboardShortcutsModal from "../components/KeyboardShortcutsModal.jsx";
import LoadingState from "../components/LoadingState.jsx";
import PatientInfo from "../components/PatientInfo.jsx";
import ReviewActions from "../components/ReviewActions.jsx";
import ReviewPanelSeparator from "../components/ReviewPanelSeparator.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SupportContactModal from "../components/SupportContactModal.jsx";
import TextSizeModal from "../components/TextSizeModal.jsx";
import TutorialModal from "../components/TutorialModal.jsx";
import UnsavedChangesModal from "../components/UnsavedChangesModal.jsx";
import ValidationPanelIconLabel from "../components/ValidationPanelIconLabel.jsx";
import ValidationSidebar from "../components/ValidationSidebar.jsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext.jsx";
import { useApplyTextSize, useTextSize } from "@/context/TextSizeContext.jsx";
import { cn } from "@/lib/utils";
import {
  addDiagnosis,
  addDiagnosisRegion,
  getDiagnosisOptions,
  getExamById,
  getExamImage,
  removeDiagnosis,
  removeDiagnosisRegion,
  saveExamDraft,
  updateExamStatus,
  updateDiagnosisRegion,
  validateExam,
} from "../services/examsService.js";
import { getSupportContact } from "../services/supportService.js";
import {
  getNextValidationExam,
  getValidationContext,
  reviewDailyDiagnosis,
} from "../services/validationService.js";
import { formatDate } from "../utils/dateUtils.js";
import { getDiagnosisRegionVisual, getDiagnosisReviewStatus } from "../utils/diagnosisRegionVisuals.js";
import { normalizeReviewNote } from "../utils/disagreementReview.js";
import {
  DEFAULT_ECG_ASPECT_RATIO,
  REVIEW_MOBILE_BREAKPOINT,
  clampReviewSidebarWidth,
  getReviewSidebarBounds,
  getReviewSidebarWidth,
} from "../utils/reviewLayout.js";
import {
  createDiagnosisReferences,
  getActiveRegionReference,
  getDiagnosisDisplayGroups,
  getDiagnosisReference,
  getRegionReference,
} from "../utils/diagnosisReferences.js";

function getAutomaticReviewResult(exam) {
  const hasDivergence = exam?.diagnoses?.some(
    (diagnosis) =>
      getDiagnosisReviewStatus(diagnosis) === "rejected" || diagnosis.source === "doctor_added",
  );

  return hasDivergence ? "alterado" : "sem_alteracao";
}

function replaceDiagnosis(exam, updatedDiagnosis) {
  return {
    ...exam,
    diagnoses: (exam?.diagnoses || []).map((diagnosis) =>
      diagnosis.id === updatedDiagnosis.id ? updatedDiagnosis : diagnosis,
    ),
  };
}

function regionLabelFor(diagnosis) {
  return diagnosis?.standard_text || diagnosis?.name || "diagnóstico";
}

function savedRegionKey(diagnosisId, region, index) {
  return `${diagnosisId}:${region.id ?? `legacy-${index}`}`;
}

// Traçado do ECG: `src` só existe quando a imagem já está decodificada; sem `src` e sem `error`, está carregando.
const ECG_IMAGE_LOADING = { src: null, error: "" };

function getEcgImageErrorMessage(requestError) {
  return requestError?.response?.status === 404
    ? "Imagem do ECG não encontrada."
    : "Não foi possível carregar o traçado do ECG.";
}

// Só indica "ocupado" se a requisição passar do limiar: pedidos rápidos (dezenas de ms) não chegam a desabilitar
// os controles — o que fazia a página inteira piscar a cada Concordo/Discordo. A trava lógica (isBusyRef) vale desde o início.
const BUSY_INDICATION_DELAY_MS = 300;

// Viewport rolável do painel de revisão (aside no desktop, Sheet no compacto). `overflow-anchor: none`: a lista de
// diagnósticos adicionais rola dentro dele e recolhe/expande itens (um aberto por vez), e a rolagem é deliberada —
// scrollDiagnosisIntoView revela a barra do item. Com a âncora de rolagem do navegador ativa, o Chrome "restaurava" o
// deslocamento anterior ao recolhimento assim que o conteúdo voltava a crescer (ex.: abrir a lista de áreas depois de
// trocar o item aberto), saltando o painel dezenas de pixels sem ação do médico.
const REVIEW_BODY_SCROLL_CLASS = "min-h-0 flex-1 [&_[data-slot=scroll-area-viewport]]:[overflow-anchor:none]";

// Numa tela 16:9 o ECG (~1,74:1) é limitado pela largura: o painel no piso de 30% deixava 226px de altura vazios no
// visualizador a 1920×1080. O piso vira o menor entre 30% e 414px: o painel mais estreito em que o exame de títulos
// mais longos (13) aparece igual, com nenhum título fechado cortado e os marcadores do cartão do dia numa linha, mais
// 4px de folga (medido a 100% e a 125%: a 410px "SUGESTIVA ÁREA ELETRICAMENTE INATIVA ANTEROSSEPTAL" já quebra em 3
// linhas; a 405px "IA concordou" desce). Com 440px, até 2026-09-30, sobravam 56px vazios abaixo do ECG a 1536×730;
// a 414px o ECG vai de 1008×578 para 1034×593 (+5% de área). Até ~1440px de janela nada muda.
// Com o texto maior (menu lateral › Tamanho do texto) o painel cresce só o necessário: o piso é a largura em que a linha
// Concordo │ Discordo … Marcar área do cartão do dia cabe com texto, mais 4px de folga (medido: 412px no Grande, 439px
// no Muito grande). Os títulos quebram mais e o painel rola mais, mas o ECG fica com ~100% e 97–98% da largura — crescer
// na proporção do texto (473 e 532px) custava 6% e 11% dele a 1536×730, tanto quanto o zoom do navegador.
const REVIEW_SIDEBAR_MIN_RATIO = 0.3;
const REVIEW_SIDEBAR_FLOOR_CAP = {
  default: 414,
  large: 416,
  "extra-large": 443,
};
// Teto da largura escolhida pelo médico (divisória entre o painel e o ECG; ver getReviewSidebarBounds): onde o título
// mais longo do banco ("RITMO COMANDADO POR MARCAPASSO ARTIFICIAL, OPERANDO EM VAT") cabe numa linha com o item
// fechado, mais 4px de folga — medido em 2026-10-02: 620, 691 e 760px. Mais largo, o painel só ganha vazio.
const REVIEW_SIDEBAR_MAX_CAP = {
  default: 624,
  large: 695,
  "extra-large": 764,
};

// "Dados do exame" abre como o médico deixou no último exame (padrão: fechado): quem o quer aberto não precisa
// reabrir a cada exame da fila. Preferência deste navegador, como o tema; sem armazenamento, vale só a sessão.
const EXAM_DATA_OPEN_KEY = "medpage.examDataOpen";

function readExamDataOpen() {
  try {
    return window.localStorage.getItem(EXAM_DATA_OPEN_KEY) === "true";
  } catch {
    return false;
  }
}

function storeExamDataOpen(open) {
  try {
    window.localStorage.setItem(EXAM_DATA_OPEN_KEY, String(open));
  } catch {
    // Armazenamento indisponível (janela privada, bloqueio): a escolha vale só até recarregar.
  }
}

function useDelayedFlag(value, delayMs) {
  const [hasSettled, setHasSettled] = useState(false);

  useEffect(() => {
    if (!value) {
      setHasSettled(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setHasSettled(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  // `value &&` derruba a indicação no mesmo render em que a requisição termina, sem esperar o efeito.
  return value && hasSettled;
}

// Altura do cartão do exame numa linha só, mesmo quando ele está em duas: o respiro vertical mais o maior entre a
// identificação, um par rótulo/valor dos dados clínicos e a ação principal.
function measureSingleRowCardHeight(card) {
  if (!card) return 0;
  const style = window.getComputedStyle(card);
  const verticalChrome = ["paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth"].reduce(
    (total, property) => total + (parseFloat(style[property]) || 0),
    0,
  );
  const clinicalData = card.querySelector('[data-testid="clinical-data"]');
  const rowParts = [
    card.querySelector("h1")?.parentElement,
    clinicalData?.querySelector("dl > div") ?? clinicalData,
    card.lastElementChild,
  ];
  return Math.round(verticalChrome + Math.max(0, ...rowParts.map((element) => element?.offsetHeight || 0)));
}

function useCompactReviewLayout() {
  const compactMediaQuery = `(max-width: ${REVIEW_MOBILE_BREAKPOINT - 1}px)`;
  const [isCompact, setIsCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.(compactMediaQuery).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(compactMediaQuery);
    if (!mediaQuery) return undefined;

    const handleChange = (event) => setIsCompact(event.matches);
    setIsCompact(mediaQuery.matches);
    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, [compactMediaQuery]);

  return isCompact;
}

export default function ExamReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  // Única tela com o tamanho do texto escolhido no menu lateral, por ora (ver useApplyTextSize).
  useApplyTextSize();
  const { textSize } = useTextSize();
  const sidebarFloorCap = REVIEW_SIDEBAR_FLOOR_CAP[textSize] ?? REVIEW_SIDEBAR_FLOOR_CAP.default;
  const sidebarMaximumCap = REVIEW_SIDEBAR_MAX_CAP[textSize] ?? REVIEW_SIDEBAR_MAX_CAP.default;
  const reviewLayoutRef = useRef(null);
  const examCardRef = useRef(null);
  const sidebarTriggerRef = useRef(null);
  const shouldRestoreSidebarFocusRef = useRef(true);
  const validationWorkspaceRef = useRef(null);
  const wasSidebarExpandedRef = useRef(false);
  const isCompactLayout = useCompactReviewLayout();
  const [exam, setExam] = useState(null);
  const [notes, setNotes] = useState("");
  const [activeRegionTarget, setActiveRegionTarget] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [diagnosisOptions, setDiagnosisOptions] = useState([]);
  const [validationContext, setValidationContext] = useState(null);
  const [supportContact, setSupportContact] = useState(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isTextSizeOpen, setIsTextSizeOpen] = useState(false);
  const [isSecondaryPanelOpen, setIsSecondaryPanelOpen] = useState(true);
  const [isMoreInformationOpen, setIsMoreInformationOpen] = useState(readExamDataOpen);
  // "Observações gerais" nasce recolhido em cada exame, como a justificativa; com texto salvo, a barra mostra o começo.
  const [isObservationsOpen, setIsObservationsOpen] = useState(false);
  const [isReviewSheetOpen, setIsReviewSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const isBusyRef = useRef(false);
  const isBusyIndicated = useDelayedFlag(isBusy, BUSY_INDICATION_DELAY_MS);
  const [error, setError] = useState("");
  const [notesSaveState, setNotesSaveState] = useState({ status: "idle", message: "" });
  const [decisionFeedbacks, setDecisionFeedbacks] = useState({});
  const [regionErrors, setRegionErrors] = useState({});
  const [hoveredRegionKey, setHoveredRegionKey] = useState(null);
  const [selectedRegionKey, setSelectedRegionKey] = useState(null);
  const decisionFeedbackTimersRef = useRef(new Map());
  const notesSaveTimerRef = useRef(null);
  const moreInformationCardRef = useRef(null);
  const observationsCardRef = useRef(null);
  const panelRevealFrameRef = useRef(0);
  const latestNotesRef = useRef("");
  const [diagnosisReviewDrafts, setDiagnosisReviewDrafts] = useState({});
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [exitIntent, setExitIntent] = useState("home");
  const [imageAspectRatio, setImageAspectRatio] = useState(DEFAULT_ECG_ASPECT_RATIO);
  const [ecgImage, setEcgImage] = useState(ECG_IMAGE_LOADING);
  const ecgImageRequestRef = useRef(null);
  const loadRequestRef = useRef(0);
  // Largura automática do painel (o ECG inteiro na altura) e os limites da divisória, medidos no layout; `null` até a
  // primeira medida. `userSidebarWidth` é a largura que o médico escolheu na divisória (`null` = automática), sempre
  // aplicada dentro dos limites do layout atual.
  const [sidebarLayout, setSidebarLayout] = useState(null);
  const [userSidebarWidth, setUserSidebarWidth] = useState(null);
  const sidebarWidth = sidebarLayout
    ? userSidebarWidth === null
      ? sidebarLayout.automaticWidth
      : clampReviewSidebarWidth(userSidebarWidth, sidebarLayout)
    : null;
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const clearNotesSaveTimer = useCallback(() => {
    if (!notesSaveTimerRef.current) return;
    window.clearTimeout(notesSaveTimerRef.current);
    notesSaveTimerRef.current = null;
  }, []);

  // Um pedido do traçado por vez: trocar de exame, tentar de novo ou sair da página cancela o anterior e descarta a
  // resposta dele — o ECG na tela é sempre o do exame aberto. Nunca rejeita: a falha vira `ecgImage.error`.
  const requestEcgImage = useCallback(() => {
    ecgImageRequestRef.current?.abort();
    const controller = new AbortController();
    ecgImageRequestRef.current = controller;
    setEcgImage(ECG_IMAGE_LOADING);
    return getExamImage(id, { signal: controller.signal }).then(
      (src) => {
        if (controller.signal.aborted) URL.revokeObjectURL(src);
        else setEcgImage({ src, error: "" });
      },
      (requestError) => {
        if (!controller.signal.aborted) setEcgImage({ src: null, error: getEcgImageErrorMessage(requestError) });
      },
    );
  }, [id]);

  const ecgImageSrc = ecgImage.src;
  useEffect(() => () => {
    if (ecgImageSrc) URL.revokeObjectURL(ecgImageSrc);
  }, [ecgImageSrc]);

  const loadExam = useCallback(async () => {
    // Só o carregamento mais recente mexe no estado: a resposta de um exame anterior nunca se mistura ao atual.
    const loadRequest = loadRequestRef.current + 1;
    loadRequestRef.current = loadRequest;
    const isCurrentLoad = () => loadRequestRef.current === loadRequest;
    clearNotesSaveTimer();
    setIsLoading(true);
    setError("");
    // O traçado vem em paralelo com os dados, e a página só aparece com ele na tela (ou com o erro dele).
    const ecgImageRequest = requestEcgImage();
    try {
      const [examData, options, contextData] = await Promise.all([
        getExamById(id),
        getDiagnosisOptions(),
        getValidationContext(),
      ]);
      if (!isCurrentLoad()) return;
      setDiagnosisOptions(options);
      setValidationContext(contextData);
      latestNotesRef.current = examData.draft_notes || "";
      setNotes(latestNotesRef.current);
      setSupportContact(contextData.support_contact || null);
      setActiveRegionTarget(null);
      setSelectedRegion(null);
      setIsSecondaryPanelOpen(true);
      setIsMoreInformationOpen(readExamDataOpen());
      setIsObservationsOpen(false);
      setIsReviewSheetOpen(false);
      setDiagnosisReviewDrafts({});
      setIsExitConfirmOpen(false);
      setNotesSaveState({ status: "idle", message: "" });
      setDecisionFeedbacks({});
      setRegionErrors({});
      setHoveredRegionKey(null);
      setSelectedRegionKey(null);
      if (examData.status_validation === "nao_validado") {
        const updatedExam = await updateExamStatus(id, "em_validacao");
        if (!isCurrentLoad()) return;
        setExam(updatedExam);
      } else {
        setExam(examData);
      }
      await ecgImageRequest;
    } catch (requestError) {
      if (!isCurrentLoad()) return;
      setError(
        requestError?.response?.data?.detail ||
          "Não foi possível carregar o exame selecionado.",
      );
    } finally {
      if (isCurrentLoad()) setIsLoading(false);
    }
  }, [clearNotesSaveTimer, id, requestEcgImage]);

  useEffect(() => () => {
    decisionFeedbackTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    decisionFeedbackTimersRef.current.clear();
    ecgImageRequestRef.current?.abort();
    clearNotesSaveTimer();
    window.cancelAnimationFrame(panelRevealFrameRef.current);
  }, [clearNotesSaveTimer]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  useEffect(() => {
    const workspace = validationWorkspaceRef.current;
    if (workspace) {
      workspace.inert = isSidebarExpanded;
    }

    let focusTimer;
    if (
      wasSidebarExpandedRef.current &&
      !isSidebarExpanded &&
      shouldRestoreSidebarFocusRef.current
    ) {
      focusTimer = window.setTimeout(() => sidebarTriggerRef.current?.focus(), 0);
    }
    if (!isSidebarExpanded) shouldRestoreSidebarFocusRef.current = true;
    wasSidebarExpandedRef.current = isSidebarExpanded;

    return () => {
      if (focusTimer) window.clearTimeout(focusTimer);
      if (workspace) workspace.inert = false;
    };
  }, [isSidebarExpanded]);

  // Com o ponteiro sobre alguma área (caixa no ECG ou linha no painel), o destaque das áreas salta de uma para a outra;
  // ao sair delas, a linha e a caixa apagam juntas em fade. Na raiz do documento porque, na tela estreita, o painel fica
  // numa gaveta fora da página; antes da pintura, para valer no mesmo quadro em que o hover muda.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute("data-region-hover", Boolean(hoveredRegionKey));
    return () => root.removeAttribute("data-region-hover");
  }, [hoveredRegionKey]);

  useLayoutEffect(() => {
    const layout = reviewLayoutRef.current;
    if (!layout || isCompactLayout) return undefined;

    function updateSidebarWidth() {
      const layoutHeight = layout.clientHeight;
      const layoutWidth = layout.clientWidth;
      if (layoutHeight <= 0 || layoutWidth <= 0) {
        return;
      }

      const usesIntermediateLayout = layoutWidth <= 920;
      // Altura medida, não um número fixo: numa coluna estreita o cartão do exame quebra em duas linhas.
      const examCard = examCardRef.current;
      const examCardHeight = examCard?.offsetHeight || 0;
      const automaticWidth = getReviewSidebarWidth({
        imageAspectRatio,
        layoutHeight,
        layoutWidth,
        maximumSidebarRatio: usesIntermediateLayout ? 0.42 : 0.32,
        minimumSidebarWidth: usesIntermediateLayout
          ? 300
          : Math.min(Math.round(layoutWidth * REVIEW_SIDEBAR_MIN_RATIO), sidebarFloorCap),
        // O que cerca o papel: 12px de cada lado; 16px em cima e embaixo + o cartão do exame + 8px de vão. As observações
        // saíram de baixo do ECG para o fim do painel (eram 8px de vão + 98px).
        viewerHorizontalChrome: 24,
        viewerVerticalChrome: 40 + examCardHeight,
      });
      // Os limites da divisória contam o cartão numa linha só: é como ele fica no lado estreito do painel, onde o ECG
      // deixa de crescer. Com a altura atual, um painel largo (cartão em duas linhas) subia o mínimo até soltar.
      const bounds = getReviewSidebarBounds({
        automaticWidth,
        imageAspectRatio,
        layoutHeight,
        layoutWidth,
        maximumSidebarCap: sidebarMaximumCap,
        viewerHorizontalChrome: 24,
        viewerVerticalChrome: 40 + measureSingleRowCardHeight(examCard),
      });

      setSidebarLayout((current) =>
        current?.automaticWidth === automaticWidth &&
        current.minimum === bounds.minimum &&
        current.maximum === bounds.maximum
          ? current
          : { automaticWidth, ...bounds },
      );
    }

    updateSidebarWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSidebarWidth);
      return () => window.removeEventListener("resize", updateSidebarWidth);
    }

    const observer = new ResizeObserver(updateSidebarWidth);
    observer.observe(layout);
    if (examCardRef.current) observer.observe(examCardRef.current);
    return () => observer.disconnect();
  }, [imageAspectRatio, isCompactLayout, isLoading, sidebarFloorCap, sidebarMaximumCap]);

  const handleDiagnosisReviewDraftChange = useCallback((diagnosisId, draft) => {
    const key = String(diagnosisId);

    setDiagnosisReviewDrafts((current) => {
      if (!draft) {
        if (!(key in current)) return current;
        const next = { ...current };
        delete next[key];
        return next;
      }

      const currentDraft = current[key];
      if (currentDraft?.isOpen === draft.isOpen && currentDraft?.note === draft.note) {
        return current;
      }
      return { ...current, [key]: draft };
    });
  }, []);

  // Uma ação por vez. Os controles só ficam `disabled` depois de BUSY_INDICATION_DELAY_MS (isBusyIndicated),
  // então nessa janela silenciosa é a ref que ignora um segundo comando.
  function acquireBusy() {
    if (isBusyRef.current) return false;
    isBusyRef.current = true;
    setIsBusy(true);
    return true;
  }

  function releaseBusy() {
    isBusyRef.current = false;
    setIsBusy(false);
  }

  async function runAction(action) {
    if (!acquireBusy()) return false;
    setError("");
    try {
      const updatedExam = await action();
      if (updatedExam) {
        setExam(updatedExam);
      }
      return true;
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "Não foi possível concluir a ação.");
      return false;
    } finally {
      releaseBusy();
    }
  }

  async function openSupport() {
    if (!supportContact) {
      try {
        setSupportContact(await getSupportContact());
      } catch {
        setSupportContact(null);
      }
    }
    setIsSupportOpen(true);
  }

  async function handleAddDiagnosis(payload) {
    let addedDiagnosis = null;
    const wasAdded = await runAction(async () => {
      addedDiagnosis = await addDiagnosis(id, payload);
      return {
        ...exam,
        diagnoses: [...(exam?.diagnoses || []), addedDiagnosis],
      };
    });

    return wasAdded ? addedDiagnosis : null;
  }

  async function handleRemoveDiagnosis(diagnosisId) {
    const wasRemoved = await runAction(async () => {
      await removeDiagnosis(id, diagnosisId);
      return {
        ...exam,
        diagnoses: exam.diagnoses.filter((diagnosis) => diagnosis.id !== diagnosisId),
      };
    });
    if (wasRemoved) {
      if (selectedRegionKey?.startsWith(`${diagnosisId}:`)) setSelectedRegionKey(null);
      if (hoveredRegionKey?.startsWith(`${diagnosisId}:`)) setHoveredRegionKey(null);
      // Remover durante a marcação: sai do modo de área em vez de deixar o alvo apontando para um diagnóstico inexistente.
      if (activeRegionTarget?.diagnosisId === diagnosisId) {
        setActiveRegionTarget(null);
        setSelectedRegion(null);
      }
    }
    return wasRemoved;
  }

  function handleStartRegion(diagnosis, region = null) {
    setError("");
    setActiveRegionTarget({
      diagnosisId: diagnosis.id,
      regionId: region?.id || null,
      label: regionLabelFor(diagnosis),
      region,
    });
    setSelectedRegion(region || null);
    setSelectedRegionKey(null);
    if (isCompactLayout) {
      setIsReviewSheetOpen(false);
    }
  }

  function handleCancelRegionSelection() {
    setActiveRegionTarget(null);
    setSelectedRegion(null);
    setSelectedRegionKey(null);
    if (isCompactLayout) {
      setIsReviewSheetOpen(true);
    }
  }

  async function handleRegionChange(region) {
    if (!region) {
      setSelectedRegion(null);
      return;
    }

    if (!activeRegionTarget) return;

    const target = activeRegionTarget;
    let savedDiagnosis = null;
    const wasSaved = await runAction(
      async () => {
        savedDiagnosis = target.regionId
          ? await updateDiagnosisRegion(target.diagnosisId, target.regionId, region)
          : await addDiagnosisRegion(target.diagnosisId, region);
        return replaceDiagnosis(exam, savedDiagnosis);
      }
    );

    if (wasSaved) {
      const savedRegions = savedDiagnosis?.regions || [];
      const savedRegionId = target.regionId || savedRegions.at(-1)?.id;
      setActiveRegionTarget(null);
      setSelectedRegion(null);
      setRegionErrors((current) => ({ ...current, [String(target.diagnosisId)]: "" }));
      if (savedRegionId) setSelectedRegionKey(`${target.diagnosisId}:${savedRegionId}`);
    }

    if (isCompactLayout) {
      setIsReviewSheetOpen(true);
    }
  }

  async function handleRemoveRegion(diagnosisId, regionId) {
    if (!regionId) return;
    if (!acquireBusy()) return;
    setRegionErrors((current) => ({ ...current, [String(diagnosisId)]: "" }));
    try {
      const updatedDiagnosis = await removeDiagnosisRegion(diagnosisId, regionId);
      setExam(replaceDiagnosis(exam, updatedDiagnosis));
      setSelectedRegionKey(null);
    } catch (requestError) {
      setRegionErrors((current) => ({
        ...current,
        [String(diagnosisId)]: [400, 409].includes(requestError?.response?.status)
          ? "Este diagnóstico exige ao menos uma área."
          : requestError?.response?.data?.detail || "Não foi possível remover a área.",
      }));
    } finally {
      releaseBusy();
    }
  }

  async function handleReviewDiagnosis(diagnosisId, reviewStatus, reviewNotes = "", feedbackKind = "decision") {
    const diagnosis = exam?.diagnoses?.find((item) => item.id === diagnosisId);
    if (reviewStatus === "confirmed" && diagnosis?.region_required_missing) {
      setError("Marque ao menos uma área do ECG antes de confirmar este diagnóstico.");
      handleStartRegion(diagnosis);
      return false;
    }

    if (!acquireBusy()) return false;
    const key = String(diagnosisId);
    for (const timerKey of [`saving:${key}`, `clear:${key}`]) {
      const timer = decisionFeedbackTimersRef.current.get(timerKey);
      if (timer) window.clearTimeout(timer);
      decisionFeedbackTimersRef.current.delete(timerKey);
    }
    setError("");
    setDecisionFeedbacks((current) => ({ ...current, [key]: null }));
    const savingTimer = window.setTimeout(() => {
      setDecisionFeedbacks((current) => ({ ...current, [key]: { type: "pending", message: "Salvando…" } }));
      decisionFeedbackTimersRef.current.delete(`saving:${key}`);
    }, 150);
    decisionFeedbackTimersRef.current.set(`saving:${key}`, savingTimer);
    try {
      const updatedExam = await reviewDailyDiagnosis(diagnosisId, reviewStatus, reviewNotes);
      setExam(updatedExam);
      window.clearTimeout(savingTimer);
      setDecisionFeedbacks((current) => ({
        ...current,
        [key]: {
          type: "success",
          message: feedbackKind === "justification" ? "✓ Justificativa salva" : "✓ Decisão salva",
        },
      }));
      const clearTimer = window.setTimeout(() => {
        setDecisionFeedbacks((current) => ({ ...current, [key]: null }));
        decisionFeedbackTimersRef.current.delete(`clear:${key}`);
      }, 1800);
      decisionFeedbackTimersRef.current.set(`clear:${key}`, clearTimer);
      return true;
    } catch {
      window.clearTimeout(savingTimer);
      setDecisionFeedbacks((current) => ({
        ...current,
        [key]: {
          type: "error",
          message: feedbackKind === "justification"
            ? "Não foi possível salvar a justificativa. Tente novamente."
            : "Não foi possível salvar a decisão. Tente novamente.",
        },
      }));
      return false;
    } finally {
      releaseBusy();
    }
  }

  function pendingSaveError() {
    if (selectedRegion && !activeRegionTarget) {
      return "Associe a área marcada a um diagnóstico antes de salvar.";
    }
    if (hasUnsavedDiagnosisReview) {
      return "Salve ou cancele a justificativa antes de continuar.";
    }
    return null;
  }

  async function saveCurrentDraft() {
    const pendingError = pendingSaveError();
    if (pendingError) {
      setError(pendingError);
      return false;
    }

    if (!acquireBusy()) return false;
    clearNotesSaveTimer();
    setError("");
    setNotesSaveState({ status: "saving", message: "Salvando…" });
    const submittedNotes = notes;
    try {
      const updatedExam = await saveExamDraft(id, { notes: submittedNotes });
      setExam(updatedExam);
      if (latestNotesRef.current !== submittedNotes) {
        setNotesSaveState({ status: "idle", message: "" });
        return true;
      }
      setNotesSaveState({ status: "saved", message: "Salvas" });
      notesSaveTimerRef.current = window.setTimeout(() => {
        setNotesSaveState({ status: "idle", message: "" });
        notesSaveTimerRef.current = null;
      }, 1800);
      return true;
    } catch {
      setNotesSaveState({ status: "error", message: "Não foi possível salvar as observações. Tente novamente." });
      // O erro fica no próprio cartão: abre-o, mesmo quando a falha veio do "Salvar e próximo" com ele recolhido.
      setIsObservationsOpen(true);
      revealPanelCard(observationsCardRef);
      return false;
    } finally {
      releaseBusy();
    }
  }

  function handleSave() {
    return saveCurrentDraft();
  }

  function handleNotesChange(value) {
    clearNotesSaveTimer();
    latestNotesRef.current = value;
    setNotes(value);
    setNotesSaveState({ status: "idle", message: "" });
  }

  // Cancelar volta ao texto salvo; o cartão continua aberto.
  function handleNotesCancel() {
    handleNotesChange(exam?.draft_notes || "");
  }

  function handleReturnHome() {
    // Início fica travado durante uma ação; na janela silenciosa o botão ainda não está `disabled`.
    if (isBusyRef.current) return;
    if (hasUnsavedChanges) {
      setExitIntent("home");
      setIsExitConfirmOpen(true);
      return;
    }
    navigate("/");
  }

  // Sair da sessão pelo menu lateral descarta o mesmo trabalho que voltar à lista: passa pela mesma confirmação.
  function handleLogout() {
    if (isBusyRef.current) return;
    if (hasUnsavedChanges) {
      setExitIntent("logout");
      setIsExitConfirmOpen(true);
      return;
    }
    logout();
  }

  function handleDiscardAndExit() {
    setIsExitConfirmOpen(false);
    if (exitIntent === "logout") logout();
    else navigate("/");
  }

  async function validateCurrentExam() {
    const pendingError = pendingSaveError();
    if (pendingError) {
      setError(pendingError);
      return false;
    }

    const reviewResult = getAutomaticReviewResult(exam);
    return runAction(
      () =>
        validateExam(id, {
          review_result: reviewResult,
          notes,
        }),
    );
  }

  async function goToNextDailyExam() {
    return runAction(async () => {
      const nextData = await getNextValidationExam();
      if (nextData.exam && String(nextData.exam.id) !== String(id)) {
        navigate(`/exams/${nextData.exam.id}`);
        return null;
      }
      navigate("/");
      return null;
    });
  }

  async function handlePrimaryAction() {
    if (validationContext?.is_configured && !validationContext.is_general_review_day) {
      const wasSaved = await saveCurrentDraft();
      if (!wasSaved) return;
      if (!requiredDecisionComplete) {
        setError("Conclua o diagnóstico do dia antes de avançar.");
        return;
      }
      await goToNextDailyExam();
      return;
    }

    const wasValidated = await validateCurrentExam();
    if (wasValidated && validationContext?.is_general_review_day) {
      await goToNextDailyExam();
    }
  }

  const diagnosisGroups = useMemo(
    () =>
      getDiagnosisDisplayGroups(exam?.diagnoses || [], {
        dailyStandardDiagnosis: validationContext?.active_standard_diagnosis,
        isGeneralReviewDay: validationContext?.is_general_review_day,
      }),
    [
      exam?.diagnoses,
      validationContext?.active_standard_diagnosis,
      validationContext?.is_general_review_day,
    ],
  );
  const diagnosisReferences = useMemo(
    () => createDiagnosisReferences(diagnosisGroups.displayOrder),
    [diagnosisGroups],
  );
  const requiredDiagnoses = diagnosisGroups.requiredDiagnoses;
  const viewerRegions = useMemo(
    () =>
      diagnosisGroups.displayOrder.flatMap((diagnosis) => {
        const diagnosisReference = getDiagnosisReference(diagnosisReferences, diagnosis.id);

        return (diagnosis.regions || []).map((region, index) => {
          const regionReference = getRegionReference(diagnosisReference, index);
          const diagnosisLabel = regionLabelFor(diagnosis);

          const regionKey = savedRegionKey(diagnosis.id, region, index);
          return {
            ...region,
            ...getDiagnosisRegionVisual(
              diagnosis,
              diagnosisReviewDrafts[String(diagnosis.id)]?.isOpen ? "rejected" : null,
              { diagnosisReference },
            ),
            regionKey,
            diagnosisId: diagnosis.id,
            diagnosisReference,
            isHovered: hoveredRegionKey === regionKey,
            isSelected: selectedRegionKey === regionKey,
            isDimmed: Boolean(selectedRegionKey && selectedRegionKey !== regionKey),
            label: regionReference ? `${regionReference} · ${diagnosisLabel}` : diagnosisLabel,
            regionReference,
          };
        });
      }),
    [
      diagnosisGroups,
      diagnosisReferences,
      diagnosisReviewDrafts,
      hoveredRegionKey,
      selectedRegionKey,
    ],
  );
  const activeRegionDiagnosis = useMemo(
    () =>
      (exam?.diagnoses || []).find(
        (diagnosis) => String(diagnosis.id) === String(activeRegionTarget?.diagnosisId),
      ) || null,
    [activeRegionTarget?.diagnosisId, exam],
  );
  const activeRegionVisual = activeRegionDiagnosis
    ? getDiagnosisRegionVisual(
        activeRegionDiagnosis,
        diagnosisReviewDrafts[String(activeRegionDiagnosis.id)]?.isOpen ? "rejected" : null,
        { diagnosisReference: getDiagnosisReference(diagnosisReferences, activeRegionDiagnosis.id) },
      )
    : null;
  const activeRegionReference = useMemo(() => {
    if (!activeRegionTarget || !activeRegionDiagnosis) return null;

    const diagnosisReference = getDiagnosisReference(diagnosisReferences, activeRegionDiagnosis.id);
    return getActiveRegionReference(
      diagnosisReference,
      activeRegionDiagnosis.regions || [],
      activeRegionTarget,
    );
  }, [activeRegionDiagnosis, activeRegionTarget, diagnosisReferences]);
  const activeDiagnosisReference = activeRegionDiagnosis
    ? getDiagnosisReference(diagnosisReferences, activeRegionDiagnosis.id)
    : null;
  const activeSelectionLabel = activeRegionTarget
    ? activeRegionTarget.regionId
      ? `Editando ${activeRegionReference || "área"}`
      : `Marcando área para ${activeDiagnosisReference || "diagnóstico"}`
    : "";
  const activeSelectionDescription = activeRegionTarget?.regionId
    ? "Ajuste a região · Esc para cancelar"
    : "Arraste ou clique em dois cantos · Esc para cancelar";
  const requiredDecisionComplete =
    !validationContext?.is_configured ||
    requiredDiagnoses.some(
      (diagnosis) =>
        getDiagnosisReviewStatus(diagnosis) !== "pending" && !diagnosis.region_required_missing,
    );
  const dirtyDiagnosisReviewId = Object.entries(diagnosisReviewDrafts).find(
    ([diagnosisId, draft]) => {
      if (!draft?.isOpen) return false;
      const diagnosis = (exam?.diagnoses || []).find(
        (item) => String(item.id) === diagnosisId,
      );
      // Texto já limpo, como no painel: espaços e enters nas bordas não contam como alteração não salva. Sem `note`
      // próprio (grupo da justificativa aberto, mostrando o texto salvo), não há alteração.
      return normalizeReviewNote(draft.note ?? diagnosis?.review_notes) !== normalizeReviewNote(diagnosis?.review_notes);
    },
  )?.[0] || null;
  const hasUnsavedDiagnosisReview = Boolean(dirtyDiagnosisReviewId);
  const hasUnsavedNotes = notes !== (exam?.draft_notes || "");
  const hasUnsavedChanges = hasUnsavedNotes || hasUnsavedDiagnosisReview;
  const usesDailyFlow = Boolean(validationContext?.is_configured && !validationContext.is_general_review_day);
  // Sem o traçado na tela não há decisão: o painel e a ação primária ficam travados até ele aparecer.
  const isEcgUnavailable = !ecgImage.src;
  const primaryDisabledReason = isEcgUnavailable
    ? "Carregue o traçado do ECG para continuar."
    : usesDailyFlow && !requiredDecisionComplete
    ? requiredDiagnoses.some(
      (diagnosis) =>
        getDiagnosisReviewStatus(diagnosis) !== "pending" && diagnosis.region_required_missing,
    )
      ? "Marque a área obrigatória no ECG para continuar."
      : "Defina Concordo ou Discordo para continuar."
    : null;

  function blockValidationInteraction(event) {
    if (!isSidebarExpanded) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function handleSavedRegionHover(regionOrKey) {
    setHoveredRegionKey(typeof regionOrKey === "string" ? regionOrKey : regionOrKey?.regionKey || null);
  }

  function handleSavedRegionSelect(regionOrKey) {
    const nextRegionKey = typeof regionOrKey === "string" ? regionOrKey : regionOrKey?.regionKey || null;
    const nextDiagnosisId = nextRegionKey?.split(":")[0];
    if (
      dirtyDiagnosisReviewId &&
      nextDiagnosisId &&
      nextDiagnosisId !== dirtyDiagnosisReviewId
    ) {
      handleReviewInteractionBlocked();
      return;
    }
    setSelectedRegionKey(nextRegionKey);
  }

  function handleReviewInteractionBlocked() {
    setError("Salve ou cancele a justificativa antes de continuar.");
  }

  // "Dados do exame" e "Observações gerais" ficam no fim do painel: na tela real (1536×730) abriam abaixo da dobra e só
  // 16 dos ~240px de "Dados do exame" apareciam — o médico via a seta virar e nada mais. Ao abrir, rola o painel só o
  // necessário para mostrar o conteúdo (nunca esconde o título acima do topo), como scrollDiagnosisIntoView nos
  // adicionais: o painel cresce em transição de 200ms e o viewport ainda não tem o overflow final, então o acompanhamento
  // segue frame a frame até ela terminar.
  function revealPanelCard(cardRef) {
    window.cancelAnimationFrame(panelRevealFrameRef.current);
    const deadline = performance.now() + 400;
    const reveal = () => {
      const card = cardRef.current;
      const viewport = card?.closest('[data-slot="scroll-area-viewport"]');
      if (!card || !viewport) return;
      const panel = card.querySelector('[data-slot="collapsible-content"]');
      const pendingHeight = panel ? Math.max(0, panel.scrollHeight - panel.getBoundingClientRect().height) : 0;
      const bounds = viewport.getBoundingClientRect();
      const target = card.getBoundingClientRect();
      const targetBottom = target.bottom + pendingHeight;
      if (targetBottom > bounds.bottom) {
        viewport.scrollTop += Math.min(target.top - bounds.top, targetBottom - bounds.bottom);
      }
      if (pendingHeight > 0.5 && performance.now() < deadline) {
        panelRevealFrameRef.current = window.requestAnimationFrame(reveal);
      }
    };
    panelRevealFrameRef.current = window.requestAnimationFrame(reveal);
  }

  function handleMoreInformationOpenChange(open) {
    setIsMoreInformationOpen(open);
    storeExamDataOpen(open);
    if (open) revealPanelCard(moreInformationCardRef);
    else window.cancelAnimationFrame(panelRevealFrameRef.current);
  }

  function handleObservationsOpenChange(open) {
    setIsObservationsOpen(open);
    if (open) revealPanelCard(observationsCardRef);
    else window.cancelAnimationFrame(panelRevealFrameRef.current);
  }

  function handleSidebarOpenChange(open, options = {}) {
    if (!open) {
      shouldRestoreSidebarFocusRef.current = options.restoreFocus ?? true;
    }
    setIsSidebarExpanded(open);
  }

  if (isLoading) {
    return <LoadingState message="Abrindo exame..." />;
  }

  if (error && !exam) {
    return (
      <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col justify-center gap-4 p-4 sm:p-6">
        <EmptyState title="Exame indisponível" message={error} />
        <Button className="self-start" type="button" onClick={() => navigate("/")} variant="outline">
          <ArrowLeft aria-hidden="true" data-icon="inline-start" />
          Voltar
        </Button>
      </div>
    );
  }

  const diagnosisPanel = (
    <DiagnosisPanel
      activeRegionTarget={activeRegionTarget}
      aiModeEnabled={Boolean(validationContext?.ai_mode_enabled)}
      dailyStandardDiagnosis={validationContext?.active_standard_diagnosis}
      diagnoses={exam.diagnoses}
      diagnosisReferences={diagnosisReferences}
      decisionFeedbacks={decisionFeedbacks}
      hoveredRegionKey={hoveredRegionKey}
      options={diagnosisOptions}
      reviewDrafts={diagnosisReviewDrafts}
      regionErrors={regionErrors}
      selectedRegionKey={selectedRegionKey}
      onAdd={handleAddDiagnosis}
      onEditRegion={handleStartRegion}
      onRemove={handleRemoveDiagnosis}
      onRemoveRegion={handleRemoveRegion}
      onRegionHover={handleSavedRegionHover}
      onRegionSelect={handleSavedRegionSelect}
      onReview={handleReviewDiagnosis}
      onReviewInteractionBlocked={handleReviewInteractionBlocked}
      onReviewDraftChange={handleDiagnosisReviewDraftChange}
      onStartRegion={handleStartRegion}
      isBusy={isBusyIndicated}
      isGeneralReviewDay={validationContext?.is_general_review_day}
      isLocked={isEcgUnavailable}
      isSecondaryOpen={isSecondaryPanelOpen}
      onSecondaryToggle={setIsSecondaryPanelOpen}
    />
  );

  const moreInformation = (
    <Collapsible onOpenChange={handleMoreInformationOpenChange} open={isMoreInformationOpen}>
      <Card className="gap-0 overflow-hidden py-0" ref={moreInformationCardRef} size="sm">
        <CardHeader className="p-0">
          {/* Botão dentro do h2 (padrão de acordeão do APG), como "Diagnósticos adicionais": a seção entra na navegação
              por títulos junto de "Dados clínicos". A barra repete a de "Diagnósticos adicionais" (h-11: o título cai a 22px
              do topo nos três cartões de seção). border-0, não border-x-0: sobrava 1px transparente em cima e embaixo, onde
              o fundo do hover não pinta (background-clip: padding-box) — uma faixa branca entre a tinta e a borda do cartão
              e outra antes da divisória. Painel estreito: "Notas do laudo" desce para uma 2ª linha, como o "Opcional" de
              "Diagnósticos adicionais" (com o nowrap e a altura fixa, o chevron saía do cartão e era recortado); o mr-1 do
              título, no lugar do ml-1 da etiqueta, a deixa alinhada ao título na 2ª linha. */}
          <h2>
            <CollapsibleTrigger
              render={
                <Button
                  className="h-auto min-h-11 w-full justify-between border-0 px-3 py-2 text-left whitespace-normal transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-inset active:not-aria-[haspopup]:translate-y-0 motion-reduce:transition-none"
                  type="button"
                  variant="collapsible"
                />
              }
            >
              {/* "Notas do laudo": as notas do próprio exame (comments) às vezes são o texto do laudo original e ficavam
                  escondidas no cartão fechado, sem sinal. Etiqueta neutra no formato da "Opcional" (propriedade do exame,
                  não estado: não muda ao abrir/fechar); o leitor de tela ouve "Dados do exame (com notas do laudo)". */}
              <ValidationPanelIconLabel className="items-start" icon={FileText}>
                <span className="mr-1">Dados do exame</span>
                {exam.comments ? (
                  <>
                    {" "}
                    <Badge aria-hidden="true" className="rounded-md bg-muted px-1.5 text-muted-foreground" variant="secondary">
                      Notas do laudo
                    </Badge>
                    <span className="sr-only">(com notas do laudo)</span>
                  </>
                ) : null}
              </ValidationPanelIconLabel>
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4"
              >
                <ChevronDown
                  className={cn(
                    "text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none",
                    isMoreInformationOpen && "rotate-180",
                  )}
                />
              </span>
            </CollapsibleTrigger>
          </h2>
        </CardHeader>
        {/* Abre e fecha com a transição de altura do painel de "Diagnósticos adicionais" (200ms, ease-out). */}
        <CollapsibleContent className="h-(--collapsible-panel-height) overflow-clip transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
          <Separator />
          {/* Mesma lista de pares rótulo/valor dos "Dados clínicos", sem caixa por item, e a mesma grade de 3 colunas:
              Data · Hora · Tipo ficam alinhados com Idade · Sexo · Nascimento. "Data e hora" numa célula só não cabia na
              coluna a 1536px. */}
          <CardContent className="py-3">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <div className="min-w-0">
                <dt className="text-xs font-medium text-muted-foreground">Data</dt>
                <dd className="mt-0.5 text-foreground tabular-nums">{formatDate(exam.exam_date)}</dd>
              </div>
              {exam.exam_time ? (
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-muted-foreground">Hora</dt>
                  <dd className="mt-0.5 text-foreground tabular-nums">{exam.exam_time}</dd>
                </div>
              ) : null}
              <div className="min-w-0">
                <dt className="text-xs font-medium text-muted-foreground">Tipo</dt>
                <dd className="mt-0.5 text-foreground">{exam.exam_type}</dd>
              </div>
              {exam.comments || exam.source_notes ? (
                <div className="col-span-full min-w-0">
                  <dt className="text-xs font-medium text-muted-foreground">Notas</dt>
                  {/* pre-line: as notas vêm do laudo com quebras de linha (lista numerada "1. Ritmo… 2. Ativação…"); sem ele
                      viravam um parágrafo corrido. Texto como vem da API, também as quebras do PDF. */}
                  <dd className="mt-0.5 flex flex-col gap-2">
                    {exam.comments ? (
                      <p className="whitespace-pre-line break-words text-sm text-foreground">{exam.comments}</p>
                    ) : null}
                    {/* source_notes é quase sempre texto padrão da origem (aviso de interpretação, Diretriz SBC, preparo de
                        pele), repetido em todo exame: vai em caption muted, abaixo das notas do próprio exame. */}
                    {exam.source_notes ? (
                      <p className="whitespace-pre-line break-words text-xs text-muted-foreground">{exam.source_notes}</p>
                    ) : null}
                  </dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );

  const reviewBody = (
    <div className="flex flex-col gap-4">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível concluir a ação</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {diagnosisPanel}
      {moreInformation}
      <GeneralObservations
        canSave={usesDailyFlow}
        cardRef={observationsCardRef}
        isBusy={isBusyIndicated}
        isOpen={isObservationsOpen}
        notes={notes}
        onCancel={handleNotesCancel}
        onNotesChange={handleNotesChange}
        onOpenChange={handleObservationsOpenChange}
        onSave={handleSave}
        saveState={notesSaveState}
        savedNotes={exam.draft_notes || ""}
      />
    </div>
  );

  const renderPrimaryAction = (className) => (
    <ReviewActions
      canValidate={requiredDecisionComplete && !isEcgUnavailable}
      className={className}
      isBusy={isBusyIndicated}
      isValid={!validationContext?.is_configured && exam.status_validation === "valido"}
      onValidate={handlePrimaryAction}
      primaryDisabledReason={primaryDisabledReason}
      primaryLabel={usesDailyFlow ? "Salvar e próximo" : "Validar exame"}
    />
  );

  // Cartão do exame no topo da coluna do ECG, como o cabeçalho do ECG impresso (identificação no alto, traçado embaixo):
  // código do exame, status, dados clínicos e a ação principal no canto direito — a ação age sobre este exame. O topo
  // alinha com o do cartão do dia. Até 2026-09-30 o código e o status ficavam numa caixa no rodapé do painel, com "Voltar"
  // e a primária, e os dados clínicos num cartão no fim do painel (a 1536×730, abaixo da dobra); o "Voltar" saiu (o
  // "Início" do trilho faz o mesmo, com a mesma confirmação). O código é o título da página (h1) e o que o médico cita ao
  // suporte; "Status atual" segue para o leitor de tela, antes do selo.
  // Coluna estreita (conteúdo do cartão até 54rem, janela abaixo de ~1360px): os dados clínicos descem para uma 2ª linha,
  // na largura toda, e a ação fica na 1ª, à direita. O limite é fixo — o exame com os seis dados e a idade calculada pede
  // ~844px numa linha (medido), com 40px de folga —, para o cartão não mudar de forma de um exame para o outro. Com o
  // texto maior (menu lateral › Tamanho do texto), a parte do texto cresce em em: 54rem (864px) no padrão, 949px no Grande
  // e 1034px no Muito grande (pedem 911 e 996px de conteúdo, medido).
  const examCard = (
    <Card
      className="@container/exam-card shrink-0 flex-row flex-wrap items-center gap-x-5 gap-y-2 py-2 pr-2 pl-3"
      data-testid="current-status"
      ref={examCardRef}
      size="sm"
    >
      <div className="flex shrink-0 items-center gap-2.5">
        <h1 className="flex flex-col text-sm leading-5 font-semibold tabular-nums">
          <span className="text-xs leading-4 font-medium text-muted-foreground">Exame</span>{" "}
          {exam.exam_code}
        </h1>
        <span className="sr-only">Status atual:</span>
        <StatusBadge
          status={exam.status_validation}
          queueState={exam.queue_state}
          reviewResult={exam.review_result}
        />
      </div>
      <span aria-hidden="true" className="my-0.5 w-px self-stretch bg-border @max-[calc(16.8125rem+42.5em)]/exam-card:hidden" />
      <div className="min-w-0 flex-1 @max-[calc(16.8125rem+42.5em)]/exam-card:order-last @max-[calc(16.8125rem+42.5em)]/exam-card:basis-full" data-testid="clinical-data">
        <h2 className="sr-only">Dados clínicos</h2>
        <PatientInfo patient={exam.patient} />
      </div>
      {renderPrimaryAction("ml-auto shrink-0")}
    </Card>
  );

  return (
    <TooltipProvider>
      <div className="grid h-svh min-h-0 grid-cols-[4rem_minmax(0,1fr)] overflow-hidden bg-secondary/40">
        <ValidationSidebar
          expanded={isSidebarExpanded}
          isBusy={isBusyIndicated}
          onHome={handleReturnHome}
          onLogout={handleLogout}
          onOpenChange={handleSidebarOpenChange}
          onShortcuts={() => setIsShortcutsOpen(true)}
          onSupport={openSupport}
          onTextSize={() => setIsTextSizeOpen(true)}
          onTutorial={() => setIsTutorialOpen(true)}
          triggerRef={sidebarTriggerRef}
        />

        <div
          className="flex min-h-0 min-w-0 flex-col overflow-hidden"
          onClickCapture={blockValidationInteraction}
          onKeyDownCapture={blockValidationInteraction}
          onPointerDownCapture={blockValidationInteraction}
          ref={validationWorkspaceRef}
        >
          {/* Sem piso no CSS: antes da primeira medida vale o da largura automática (o menor entre 30% e o piso); depois,
              a largura medida ou a escolhida na divisória, que pode ficar abaixo dele. */}
          <main
            className="relative flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[var(--review-sidebar-width)_minmax(0,1fr)]"
            ref={reviewLayoutRef}
            style={{ "--review-sidebar-width": sidebarWidth ? `${sidebarWidth}px` : `min(30%, ${sidebarFloorCap}px)` }}
          >
            {!isCompactLayout ? (
              <aside
                aria-label="Diagnósticos e ações"
                className="flex min-h-0 min-w-0 flex-col border-r bg-background"
                id="review-panel"
              >
                <ScrollArea className={REVIEW_BODY_SCROLL_CLASS}>
                  <div className="p-4">{reviewBody}</div>
                </ScrollArea>
              </aside>
            ) : null}
            {!isCompactLayout && sidebarLayout ? (
              <ReviewPanelSeparator
                controlsId="review-panel"
                layoutRef={reviewLayoutRef}
                maximum={sidebarLayout.maximum}
                minimum={sidebarLayout.minimum}
                onChange={setUserSidebarWidth}
                width={sidebarWidth}
              />
            ) : null}

            {/* 16px em cima e embaixo, como o painel: o topo do cartão do exame alinha com o primeiro cartão do painel (com
                12px ficavam 4px desencontrados). Nas laterais seguem 12px. */}
            <section
              aria-label="Visualizador de ECG"
              className="flex min-h-0 min-w-0 flex-1 overflow-y-auto p-2 pb-20 md:px-3 md:py-4"
            >
              <div className="flex min-h-full w-full flex-col gap-2">
                {examCard}
                <EcgViewer
                  imageError={ecgImage.error}
                  imageUrl={ecgImage.src}
                  onImageAspectRatioChange={setImageAspectRatio}
                  onImageRetry={requestEcgImage}
                  onRegionCancel={handleCancelRegionSelection}
                  selectedRegion={selectedRegion}
                  onRegionChange={handleRegionChange}
                  onRegionHover={handleSavedRegionHover}
                  onRegionSelect={handleSavedRegionSelect}
                  regions={viewerRegions}
                  selectionDescription={activeSelectionDescription}
                  selectionLabel={activeSelectionLabel}
                  selectionReference={activeRegionReference}
                  selectionVisual={activeRegionVisual}
                />
              </div>
            </section>
          </main>

          {isCompactLayout ? (
            <Sheet open={isReviewSheetOpen} onOpenChange={setIsReviewSheetOpen}>
              {/* Começa depois do trilho de navegação (w-16): na largura toda, a barra cobria o "Sair da sessão" no pé do
                  trilho e o toque nele abria "Diagnósticos e ações". O conteúdo principal já reserva a altura da barra.
                  Fundo opaco, sem desfoque (o DESIGN.md recusa vidro): a borda de cima já separa a barra da página. */}
              <div className="fixed right-0 bottom-0 left-16 flex justify-center border-t bg-background p-3">
                <SheetTrigger render={<Button className="w-full max-w-sm" size="lg" type="button" />}>
                  <PanelRightOpen aria-hidden="true" data-icon="inline-start" />
                  Diagnósticos e ações
                </SheetTrigger>
              </div>
              <SheetContent
                className="gap-0 data-[side=right]:w-[min(94vw,30rem)] data-[side=right]:sm:max-w-none"
                side="right"
              >
                <SheetHeader className="border-b bg-accent/60 pr-12">
                  <SheetTitle>Diagnósticos e ações</SheetTitle>
                  <SheetDescription>Revise os achados e conclua este ECG.</SheetDescription>
                </SheetHeader>
                <ScrollArea className={REVIEW_BODY_SCROLL_CLASS}>
                  <div className="p-4">{reviewBody}</div>
                </ScrollArea>
                {/* A gaveta cobre o cartão do exame: a ação principal se repete no rodapé dela. */}
                <SheetFooter className="shrink-0 border-t bg-background">
                  {renderPrimaryAction("w-full")}
                </SheetFooter>
              </SheetContent>
            </Sheet>
          ) : null}
        </div>

        <SupportContactModal
          contact={supportContact}
          isOpen={isSupportOpen}
          onClose={() => setIsSupportOpen(false)}
        />
        <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
        <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
        <TextSizeModal isOpen={isTextSizeOpen} onClose={() => setIsTextSizeOpen(false)} />
        <UnsavedChangesModal
          intent={exitIntent}
          isOpen={isExitConfirmOpen}
          onDiscard={handleDiscardAndExit}
          onStay={() => setIsExitConfirmOpen(false)}
        />
      </div>
    </TooltipProvider>
  );
}
