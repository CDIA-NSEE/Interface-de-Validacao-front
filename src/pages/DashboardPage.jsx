import { CalendarDays, PlayCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import ActiveFiltersBar from "../components/ActiveFiltersBar.jsx";
import AppHeader from "../components/AppHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ExamFilters from "../components/ExamFilters.jsx";
import ExamList from "../components/ExamList.jsx";
import FloatingSupportButton from "../components/FloatingSupportButton.jsx";
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

const initialFilters = {
  status: "",
  source: "pending",
  review_result: "",
  search: "",
};

const quickFilterConfig = {
  pending: {
    key: "pending",
    label: "Pendentes",
    filters: { status: "nao_validado", review_result: "" },
  },
  in_validation: {
    key: "in_validation",
    label: "Em validação",
    filters: { status: "em_validacao", review_result: "" },
  },
  reviewed_total: {
    key: "reviewed_total",
    label: "Revisados",
    filters: { status: "valido", review_result: "" },
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
      title: "Fila do dia concluida",
      message: "Nao ha ECG pendente para o diagnostico ativo.",
    };
  }
  if (quickFilter) {
    return {
      title: "Nenhum exame encontrado",
      message: "Limpe o filtro rapido ou ajuste a busca.",
    };
  }
  if (hasSearch) {
    return {
      title: "Nenhum exame encontrado",
      message: "Ajuste ou limpe a busca para voltar a fila de revisao.",
    };
  }
  return {
    title: "Nenhum exame aguardando revisao",
    message: "Use os filtros rapidos do resumo para visualizar exames revisados.",
  };
}

function contextTitle(context) {
  if (!context) return "Carregando diagnostico do dia";
  if (context.is_general_review_day) return "Dia 30: revalidacao geral";
  if (context.active_standard_diagnosis) return context.active_standard_diagnosis;
  return "Agenda de diagnostico nao configurada";
}

function getQueueMetric(context, openQueue, legacyOpenQueue) {
  if (!context) {
    return {
      value: "--",
      label: "Carregando fila",
      ariaLabel: "Carregando fila",
    };
  }

  if (context.is_configured) {
    const label = `ECG${openQueue === 1 ? "" : "s"} pendente${openQueue === 1 ? "" : "s"}`;
    return {
      value: openQueue,
      label,
      ariaLabel: `${openQueue} ${label}`,
    };
  }

  const examLabel = legacyOpenQueue === 1 ? "exame" : "exames";
  const availabilityLabel = legacyOpenQueue === 1 ? "disponivel" : "disponiveis";
  const label = `${examLabel} ${availabilityLabel}`;
  return {
    value: legacyOpenQueue,
    label,
    ariaLabel: `${legacyOpenQueue} ${label}`,
  };
}

function getHeroCopy(context) {
  if (!context) return "Buscando configuracao do ciclo.";
  if (!context.is_configured) return "Agenda diaria nao configurada; usando a fila disponivel.";
  if (context.is_general_review_day) return "Revalidacao geral do ciclo.";
  return "Diagnostico padronizado do dia.";
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(initialFilters);
  const [quickFilter, setQuickFilter] = useState(null);
  const [stats, setStats] = useState(null);
  const [exams, setExams] = useState([]);
  const [allExams, setAllExams] = useState([]);
  const [validationContext, setValidationContext] = useState(null);
  const [validationQueue, setValidationQueue] = useState([]);
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
      setSupportContact(contextData.support_contact || null);
    } catch (requestError) {
      setValidationContext(null);
      setValidationQueue([]);
      setOverviewError(
        requestError?.response?.data?.detail ||
          "Nao foi possivel carregar o contexto de validacao diaria.",
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
          "A API nao respondeu em http://localhost:8000. Inicie o back para carregar metricas e exames.",
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
      setExams(quickFilter ? examsData : [...examsData].sort(actionQueueSort));
    } catch (requestError) {
      setExams([]);
      setError(
        requestError?.response?.data?.detail ||
          "Nao foi possivel carregar os exames. Verifique se o back esta rodando em http://localhost:8000.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters, quickFilter]);

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

    if (quickFilter?.key === key) {
      clearQuickFilter();
      return;
    }

    setQuickFilter(nextQuickFilter);
    setFilters((currentFilters) => ({
      ...currentFilters,
      source: "all",
      status: nextQuickFilter.filters.status,
      review_result: nextQuickFilter.filters.review_result,
    }));
  }

  function clearQuickFilter() {
    setQuickFilter(null);
    setFilters((currentFilters) => ({
      ...currentFilters,
      status: "",
      source: "pending",
      review_result: "",
    }));
  }

  function clearAllFilters() {
    setQuickFilter(null);
    setFilters(initialFilters);
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
      setError("Nenhum ECG pendente na fila do dia.");
      return;
    }

    const nextExam = await openLegacyNextExam();
    if (nextExam) {
      navigate(`/exams/${nextExam.id}`);
      return;
    }

    setError("Nenhum exame aguardando revisao.");
  }

  const hasSearch = Boolean(filters.search.trim());
  const hasAnyFilter = Boolean(hasSearch || quickFilter);
  const useDailyQueue = Boolean(validationContext?.is_configured && !hasAnyFilter);
  const displayedExams = useDailyQueue ? validationQueue : exams;
  const emptyStateCopy = getEmptyStateCopy(quickFilter, hasSearch, useDailyQueue);
  const workQueueTitle = quickFilter?.label || (useDailyQueue ? "Pendentes" : "Fila de trabalho");
  const workQueueDescription =
    useDailyQueue || quickFilter?.key === "pending"
      ? "Exames ainda nao iniciados."
      : "Exames filtrados para consulta rapida.";
  const legacyOpenQueue =
    stats != null
      ? Number(stats.pending_total || 0) + Number(stats.in_validation_total || 0)
      : allExams.filter((exam) => exam.status_validation !== "valido").length;
  const openQueue = validationContext?.is_configured ? validationQueue.length : legacyOpenQueue;
  const queueStartCount = validationContext?.is_configured ? openQueue : legacyOpenQueue;
  const canStartQueue = Boolean(validationContext && queueStartCount > 0);

  const dailyStatus = useMemo(() => {
    if (!validationContext) return "Carregando";
    if (!validationContext.is_configured) return "Configuracao pendente";
    if (validationContext.is_general_review_day) return "Revalidacao geral";
    return `Dia ${validationContext.day_index || "-"}`;
  }, [validationContext]);
  const queueMetric = getQueueMetric(validationContext, openQueue, legacyOpenQueue);
  const heroCopy = getHeroCopy(validationContext);

  return (
    <div className="dashboard-page">
      <div className="page-shell">
        <AppHeader onContact={openSupport} onTutorial={() => setIsTutorialOpen(true)} />

        <section className="dashboard-queue-hero" aria-label="Fila de validacao">
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
            <div className="queue-metric" role="group" aria-label={queueMetric.ariaLabel}>
              <strong>{queueMetric.value}</strong>
              <span>{queueMetric.label}</span>
            </div>
            <button
              className="button primary-action"
              type="button"
              onClick={handleOpenNextExam}
              disabled={!canStartQueue}
            >
              <PlayCircle size={19} aria-hidden="true" />
              Iniciar validacao
            </button>
          </div>
        </section>

        <div className={`dashboard-workspace${summaryCollapsed ? " summary-collapsed" : ""}`}>
          <main className="dashboard-main">
            <section className="work-queue-panel" aria-label="Fila de trabalho">
              <div className="work-queue-toolbar">
                <ExamFilters filters={filters} onChange={handleFiltersChange} />
                <header className="work-queue-header">
                  <div>
                    <h2>{workQueueTitle}</h2>
                    <p>{workQueueDescription}</p>
                  </div>
                  <span className="work-queue-count" aria-label={`${displayedExams.length} exames na fila`}>
                    {displayedExams.length}
                  </span>
                </header>
              </div>
              <ActiveFiltersBar
                quickFilter={quickFilter}
                hasAnyFilter={hasAnyFilter}
                onClearQuickFilter={clearQuickFilter}
                onClearAll={clearAllFilters}
              />

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
              onToggleCollapsed={() => setSummaryCollapsed((current) => !current)}
              onQuickFilter={applyQuickFilter}
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
      <FloatingSupportButton onClick={openSupport} />
    </div>
  );
}
