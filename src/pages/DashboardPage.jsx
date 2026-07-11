import { CalendarDays, PlayCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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
    tone: QUEUE_STATE_META.all.tone,
    filters: { queue_state: "all" },
  },
  start: {
    key: "start",
    label: QUEUE_STATE_META.start.label,
    tone: QUEUE_STATE_META.start.tone,
    filters: { queue_state: "start" },
  },
  validated: {
    key: "validated",
    label: QUEUE_STATE_META.validated.label,
    tone: QUEUE_STATE_META.validated.tone,
    filters: { queue_state: "validated" },
  },
  completed: {
    key: "completed",
    label: QUEUE_STATE_META.completed.label,
    tone: QUEUE_STATE_META.completed.tone,
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

function getEmptyStateCopy(quickFilter, hasSearch, isDailyQueue) {
  if (isDailyQueue) {
    return {
      title: "Fila do dia concluída",
      message: "Não há ECG para iniciar no diagnóstico ativo.",
    };
  }
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

    try {
      const allExamsData = await getExams();
      setAllExams(allExamsData);
    } catch {
      setAllExams([]);
    }
  }, []);

  const loadExams = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const examsData = await getExams(filters);
      setExams([...examsData].sort(actionQueueSort));
    } catch (requestError) {
      setExams([]);
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
  const displayedExams = exams;
  const emptyStateCopy = getEmptyStateCopy(quickFilter, hasSearch, false);
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
  const heroCopy = getHeroCopy(validationContext);

  return (
    <div className="dashboard-page">
      <div className="page-shell">
        <AppHeader onContact={openSupport} onTutorial={() => setIsTutorialOpen(true)} />

        <section className="dashboard-queue-hero" aria-label="Fila de validação">
          <div className="queue-hero-main">
            <span className="daily-context-icon" aria-hidden="true">
              <CalendarDays size={24} />
            </span>
            <div className="queue-hero-copy">
              <span className="eyebrow">{dailyStatus}</span>
              <h2>{contextTitle(validationContext)}</h2>
              <p>{heroCopy}</p>
            </div>
          </div>
          <div className="queue-hero-actions">
            {showQueueProgress ? (
              <div className="queue-progress" aria-label={`Progresso da fila: ${queueProgressText}`}>
                <div className="queue-progress-copy">
                  <span>Progresso da fila</span>
                  <strong>{queueProgressText}</strong>
                </div>
                {activeQueueProgress.total > 0 ? (
                  <div
                    className="queue-progress-track"
                    role="progressbar"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={activeQueueProgress.percent}
                  >
                    <span style={{ width: `${activeQueueProgress.percent}%` }} />
                  </div>
                ) : null}
              </div>
            ) : null}
            <button
              className="button primary-action"
              type="button"
              onClick={handleOpenNextExam}
              disabled={!canStartQueue}
            >
              <PlayCircle size={19} aria-hidden="true" />
              Iniciar validação
            </button>
          </div>
        </section>

        <div className={`dashboard-workspace${summaryCollapsed ? " summary-collapsed" : ""}`}>
          <main className="dashboard-main">
            <section className="work-queue-panel" aria-label="Fila de trabalho">
              <div className="work-queue-toolbar">
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
              </div>

              {error || overviewError ? (
                <EmptyState title="Erro ao carregar" message={error || overviewError} />
              ) : null}
              {isLoading ? (
                <LoadingState message="Buscando exames..." />
              ) : (
                <ExamList
                  exams={displayedExams}
                  emptyTitle={emptyStateCopy.title}
                  emptyMessage={emptyStateCopy.message}
                />
              )}
            </section>
          </main>

          <aside className="summary-sidebar">
            <ValidationSummaryPanel
              stats={stats}
              collapsed={summaryCollapsed}
              quickFilter={quickFilter}
              refinementFilters={refinementFilters}
              onToggleCollapsed={() => setSummaryCollapsed((current) => !current)}
              onQuickFilter={applyQuickFilter}
              onRefinementFilter={applyRefinementFilter}
            />
          </aside>
        </div>
      </div>

      <SupportContactModal
        contact={supportContact}
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
    </div>
  );
}
