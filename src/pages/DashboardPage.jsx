import { CalendarDays, CircleAlert, PlayCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import ActiveFiltersBar from "../components/ActiveFiltersBar.jsx";
import AppHeader from "../components/AppHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ExamFilters from "../components/ExamFilters.jsx";
import ExamList from "../components/ExamList.jsx";
import LoadingState from "../components/LoadingState.jsx";
import SupportContactModal from "../components/SupportContactModal.jsx";
import TutorialModal from "../components/TutorialModal.jsx";
import ValidationSummaryPanel from "../components/ValidationSummaryPanel.jsx";
import { getStats } from "../services/dashboardService.js";
import { getExams } from "../services/examsService.js";
import { getSupportContact } from "../services/supportService.js";
import {
  getNextValidationExam,
  getValidationContext,
  getValidationQueue,
} from "../services/validationService.js";
import { QUEUE_STATE_META, REFINEMENT_META } from "../utils/queueSemantics.js";

const initialFilters = {
  queue_state: "all",
  decision: "",
  region: "",
  search: "",
};

const emptyQueueProgress = {
  total: 0,
  remaining: 0,
  completed: 0,
  percent: 0,
};

const quickFilterConfig = {
  all: {
    key: "all",
    label: QUEUE_STATE_META.all.label,
    filters: { queue_state: "all" },
  },
  start: {
    key: "start",
    label: QUEUE_STATE_META.start.label,
    filters: { queue_state: "start" },
  },
  validated: {
    key: "validated",
    label: QUEUE_STATE_META.validated.label,
    filters: { queue_state: "validated" },
  },
  completed: {
    key: "completed",
    label: QUEUE_STATE_META.completed.label,
    filters: { queue_state: "completed" },
  },
};

const refinementFilterConfig = {
  decision: {
    confirmed: { ...REFINEMENT_META.confirmed, filters: { decision: "confirmed" } },
    rejected: { ...REFINEMENT_META.rejected, filters: { decision: "rejected" } },
  },
  region: {
    with_region: { ...REFINEMENT_META.with_region, filters: { region: "with_region" } },
    without_region: { ...REFINEMENT_META.without_region, filters: { region: "without_region" } },
  },
};

const actionQueuePriority = {
  em_validacao: 0,
  nao_validado: 1,
};

function actionQueueSort(firstExam, secondExam) {
  const statusDifference =
    (actionQueuePriority[firstExam.status_validation] ?? 2) -
    (actionQueuePriority[secondExam.status_validation] ?? 2);

  if (statusDifference) return statusDifference;
  return new Date(firstExam.created_at) - new Date(secondExam.created_at);
}

function getEmptyStateCopy(quickFilter, hasSearch) {
  if (quickFilter?.key && quickFilter.key !== "all") {
    return {
      title: "Nenhum exame encontrado",
      message: "Limpe o filtro selecionado ou ajuste a busca.",
    };
  }
  if (hasSearch) {
    return {
      title: "Nenhum exame encontrado",
      message: "Ajuste ou limpe a busca para voltar à fila de revisão.",
    };
  }
  return {
    title: "Nenhum exame encontrado",
    message: "Use os filtros do resumo para ajustar a visualização.",
  };
}

function contextTitle(context) {
  if (!context) return "Carregando diagnóstico do dia";
  if (context.is_general_review_day) return "Dia 30: revalidação geral";
  if (context.active_standard_diagnosis) return context.active_standard_diagnosis;
  return "Agenda de diagnóstico não configurada";
}

function getHeroCopy(context) {
  if (!context) return "Buscando configuração do ciclo.";
  if (!context.is_configured) return "Agenda diária não configurada; usando a fila disponível.";
  if (context.is_general_review_day) return "Revalidação geral do ciclo.";
  return "Diagnóstico padronizado do dia.";
}

function normalizeQueueProgress(progress, fallbackRemaining = 0) {
  const total = Number(progress?.total ?? fallbackRemaining ?? 0);
  const remaining = Number(progress?.remaining ?? fallbackRemaining ?? 0);
  const completed = Number(progress?.completed ?? Math.max(total - remaining, 0));
  const rawPercent = Number(progress?.percent ?? (total ? (completed / total) * 100 : 0));

  return {
    total: Math.max(total, 0),
    remaining: Math.max(remaining, 0),
    completed: Math.max(completed, 0),
    percent: Math.min(Math.max(Math.round(rawPercent), 0), 100),
  };
}

function hasActiveExamFilters(filters) {
  return Boolean(
    filters.search.trim() ||
      filters.queue_state !== "all" ||
      filters.decision ||
      filters.region,
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(initialFilters);
  const [quickFilter, setQuickFilter] = useState(quickFilterConfig.all);
  const [refinementFilters, setRefinementFilters] = useState({
    decision: null,
    region: null,
  });
  const [stats, setStats] = useState(null);
  const [exams, setExams] = useState([]);
  const [allExams, setAllExams] = useState([]);
  const [validationContext, setValidationContext] = useState(null);
  const [validationQueue, setValidationQueue] = useState([]);
  const [queueProgress, setQueueProgress] = useState(emptyQueueProgress);
  const [supportContact, setSupportContact] = useState(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [overviewError, setOverviewError] = useState("");

  useEffect(() => {
    window.localStorage.removeItem("summaryPanelCollapsed");
  }, []);

  const loadValidation = useCallback(async () => {
    try {
      const [contextData, queueData] = await Promise.all([
        getValidationContext(),
        getValidationQueue(),
      ]);
      setValidationContext(contextData);
      setValidationQueue(queueData.items || []);
      setQueueProgress(normalizeQueueProgress(queueData.progress, queueData.items?.length || 0));
      setSupportContact(contextData.support_contact || null);
    } catch (requestError) {
      setValidationContext(null);
      setValidationQueue([]);
      setQueueProgress(emptyQueueProgress);
      setOverviewError(
        requestError?.response?.data?.detail ||
          "Não foi possível carregar o contexto de validação diária.",
      );
    }
  }, []);

  const loadOverview = useCallback(async () => {
    setOverviewError("");
    try {
      const statsData = await getStats();
      setStats(statsData);
    } catch (requestError) {
      setStats(null);
      setOverviewError(
        requestError?.response?.data?.detail ||
          "A API não respondeu em http://localhost:8000. Inicie o back para carregar métricas e exames.",
      );
    }

  }, []);

  const loadExams = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const isFiltered = hasActiveExamFilters(filters);
      const examsData = await getExams(filters);
      setExams([...examsData].sort(actionQueueSort));
      if (!isFiltered) setAllExams(examsData);
    } catch (requestError) {
      setExams([]);
      if (!hasActiveExamFilters(filters)) setAllExams([]);
      setError(
        requestError?.response?.data?.detail ||
          "Não foi possível carregar os exames. Verifique se o back está rodando em http://localhost:8000.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadOverview();
    loadValidation();
  }, [loadOverview, loadValidation]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  function handleFiltersChange(nextFilters) {
    setFilters(nextFilters);
  }

  function applyQuickFilter(key) {
    const nextQuickFilter = quickFilterConfig[key];
    if (!nextQuickFilter) return;

    setQuickFilter(nextQuickFilter);
    setFilters((currentFilters) => ({
      ...currentFilters,
      queue_state: nextQuickFilter.filters.queue_state,
    }));
  }

  function applyRefinementFilter(type, key) {
    const config = refinementFilterConfig[type]?.[key];
    if (!config) return;

    const isActive = refinementFilters[type]?.key === key;
    const nextValue = isActive ? null : config;

    setRefinementFilters((currentFilters) => ({
      ...currentFilters,
      [type]: nextValue,
    }));
    setFilters((currentFilters) => ({
      ...currentFilters,
      [type]: nextValue ? config.filters[type] : "",
    }));
  }

  function clearQuickFilter() {
    setQuickFilter(quickFilterConfig.all);
    setFilters((currentFilters) => ({
      ...currentFilters,
      queue_state: quickFilterConfig.all.filters.queue_state,
    }));
  }

  function clearRefinementFilter(type) {
    setRefinementFilters((currentFilters) => ({
      ...currentFilters,
      [type]: null,
    }));
    setFilters((currentFilters) => ({
      ...currentFilters,
      [type]: "",
    }));
  }

  function clearAllFilters() {
    setQuickFilter(quickFilterConfig.all);
    setRefinementFilters({ decision: null, region: null });
    setFilters(initialFilters);
  }

  function clearSearchFilter() {
    setFilters((currentFilters) => ({
      ...currentFilters,
      search: "",
    }));
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

  async function openLegacyNextExam() {
    const orderedExams = [...allExams].sort(actionQueueSort);
    const inValidationExam = orderedExams.find(
      (exam) => exam.status_validation === "em_validacao",
    );
    const pendingExam = orderedExams.find((exam) => exam.status_validation === "nao_validado");
    let nextExam = inValidationExam || pendingExam;

    if (!nextExam) {
      const [inValidationExams, pendingExams] = await Promise.all([
        getExams({ status: "em_validacao" }),
        getExams({ status: "nao_validado" }),
      ]);
      nextExam =
        [...inValidationExams].sort(actionQueueSort)[0] ||
        [...pendingExams].sort(actionQueueSort)[0];
    }

    return nextExam;
  }

  async function handleOpenNextExam() {
    setError("");

    if (validationContext?.is_configured) {
      const nextData = await getNextValidationExam();
      if (nextData.exam) {
        navigate(`/exams/${nextData.exam.id}`);
        return;
      }
      setError("Nenhum ECG para iniciar na fila do dia.");
      return;
    }

    const nextExam = await openLegacyNextExam();
    if (nextExam) {
      navigate(`/exams/${nextExam.id}`);
      return;
    }

    setError("Nenhum exame para iniciar.");
  }

  const hasSearch = Boolean(filters.search.trim());
  const hasRefinementFilter = Boolean(refinementFilters.decision || refinementFilters.region);
  const hasNonDefaultState = quickFilter?.key !== quickFilterConfig.all.key;
  const hasAnyFilter = Boolean(hasSearch || hasNonDefaultState || hasRefinementFilter);
  const emptyStateCopy = getEmptyStateCopy(quickFilter, hasSearch);
  const legacyOpenQueue =
    stats != null
      ? Number(stats.pending_total || 0) + Number(stats.in_validation_total || 0)
      : allExams.filter((exam) => exam.status_validation !== "valido").length;
  const activeQueueProgress = normalizeQueueProgress(queueProgress, validationQueue.length);
  const openQueue = validationContext?.is_configured ? activeQueueProgress.remaining : legacyOpenQueue;
  const queueStartCount = validationContext?.is_configured ? openQueue : legacyOpenQueue;
  const canStartQueue = Boolean(validationContext && queueStartCount > 0);
  const showQueueProgress = Boolean(validationContext?.is_configured);
  const queueProgressText =
    activeQueueProgress.total > 0
      ? `${activeQueueProgress.remaining} restantes de ${activeQueueProgress.total}`
      : "Sem exames nesta fila";
  const dailyStatus = useMemo(() => {
    if (!validationContext) return "Carregando";
    if (!validationContext.is_configured) return "Configuração pendente";
    if (validationContext.is_general_review_day) return "Revalidação geral";
    return `Dia ${validationContext.day_index || "-"}`;
  }, [validationContext]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-5 px-3 py-4 sm:px-5 lg:px-8">
        <AppHeader onContact={openSupport} onTutorial={() => setIsTutorialOpen(true)} />

        <Card
          aria-label="Fila de validação"
          className="[--card-spacing:--spacing(5)] lg:grid lg:grid-cols-[minmax(15rem,0.8fr)_minmax(20rem,1.4fr)_auto] lg:items-stretch lg:gap-0 lg:py-0"
          variant="highlight"
        >
          <CardHeader className="lg:self-center lg:py-5">
            <CardTitle className="flex items-center gap-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                <CalendarDays className="size-5" aria-hidden="true" />
              </span>
              <h2>{contextTitle(validationContext)}</h2>
            </CardTitle>
            <CardDescription>{getHeroCopy(validationContext)}</CardDescription>
            <CardAction>
              <Badge variant={validationContext?.is_configured ? "info" : "warning"}>
                {dailyStatus}
              </Badge>
            </CardAction>
          </CardHeader>

          {showQueueProgress ? (
            <CardContent className="flex flex-col gap-2 lg:justify-center lg:border-l lg:py-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">Progresso da fila</span>
                <strong className="tabular-nums">{queueProgressText}</strong>
              </div>
              {activeQueueProgress.total > 0 ? (
                <Progress
                  value={activeQueueProgress.percent}
                  aria-label={`Progresso da fila: ${queueProgressText}`}
                />
              ) : null}
            </CardContent>
          ) : null}

          <CardFooter className="justify-end border-primary/15 bg-primary/8 lg:rounded-none lg:rounded-r-xl lg:border-t-0 lg:border-l">
            <Button
              type="button"
              size="lg"
              onClick={handleOpenNextExam}
              disabled={!canStartQueue}
              className="w-full sm:w-auto"
            >
              <PlayCircle data-icon="inline-start" aria-hidden="true" />
              Iniciar validação
            </Button>
          </CardFooter>
        </Card>

        <div
          className={cn(
            "grid items-start gap-5",
            summaryCollapsed
              ? "lg:grid-cols-[minmax(0,1fr)_auto]"
              : "lg:grid-cols-[minmax(0,1fr)_20rem]",
          )}
        >
          <main className="min-w-0">
            <Card aria-label="Fila de trabalho">
              <CardHeader className="gap-4">
                <ExamFilters filters={filters} onChange={handleFiltersChange} />
                <ActiveFiltersBar
                  quickFilter={quickFilter}
                  refinementFilters={refinementFilters}
                  searchValue={filters.search}
                  hasAnyFilter={hasAnyFilter}
                  onClearQuickFilter={clearQuickFilter}
                  onClearRefinement={clearRefinementFilter}
                  onClearSearch={clearSearchFilter}
                  onClearAll={clearAllFilters}
                />
              </CardHeader>

              <CardContent className="flex flex-col gap-4">
                {error || overviewError ? (
                  <Alert variant="destructive">
                    <CircleAlert aria-hidden="true" />
                    <AlertTitle>Erro ao carregar</AlertTitle>
                    <AlertDescription>{error || overviewError}</AlertDescription>
                  </Alert>
                ) : null}
                {isLoading ? (
                  <LoadingState message="Buscando exames..." />
                ) : (
                  <ExamList
                    exams={exams}
                    emptyTitle={emptyStateCopy.title}
                    emptyMessage={emptyStateCopy.message}
                  />
                )}
              </CardContent>
            </Card>
          </main>

          <div className="min-w-0 lg:sticky lg:top-4">
            <ValidationSummaryPanel
              stats={stats}
              collapsed={summaryCollapsed}
              quickFilter={quickFilter}
              refinementFilters={refinementFilters}
              onToggleCollapsed={() => setSummaryCollapsed((current) => !current)}
              onQuickFilter={applyQuickFilter}
              onRefinementFilter={applyRefinementFilter}
            />
          </div>
        </div>
      </div>

      <SupportContactModal
        contact={supportContact}
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
      </div>
    </TooltipProvider>
  );
}
