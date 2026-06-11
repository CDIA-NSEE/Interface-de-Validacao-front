import { PlayCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import ActiveFiltersBar from "../components/ActiveFiltersBar.jsx";
import AppHeader from "../components/AppHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ExamFilters from "../components/ExamFilters.jsx";
import ExamList from "../components/ExamList.jsx";
import LoadingState from "../components/LoadingState.jsx";
import ValidationSummaryPanel from "../components/ValidationSummaryPanel.jsx";
import { getStats } from "../services/dashboardService.js";
import { getExams } from "../services/examsService.js";

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
  without_change: {
    key: "without_change",
    label: "Sem alteração",
    filters: { status: "valido", review_result: "sem_alteracao" },
  },
  altered: {
    key: "altered",
    label: "Alterados",
    filters: { status: "valido", review_result: "alterado" },
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
  if (quickFilter) {
    return {
      title: "Nenhum exame encontrado",
      message: "Limpe o filtro rápido ou ajuste a busca.",
    };
  }
  if (hasSearch) {
    return {
      title: "Nenhum exame encontrado",
      message: "Ajuste ou limpe a busca para voltar à fila de revisão.",
    };
  }
  return {
    title: "Nenhum exame aguardando revisão",
    message: "Use os filtros rápidos do resumo para visualizar exames revisados.",
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(initialFilters);
  const [quickFilter, setQuickFilter] = useState(null);
  const [stats, setStats] = useState(null);
  const [exams, setExams] = useState([]);
  const [allExams, setAllExams] = useState([]);
  const [summaryCollapsed, setSummaryCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = window.localStorage.getItem("summaryPanelCollapsed");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(max-width: 920px)").matches;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [overviewError, setOverviewError] = useState("");

  useEffect(() => {
    window.localStorage.setItem("summaryPanelCollapsed", String(summaryCollapsed));
  }, [summaryCollapsed]);

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
      setExams(quickFilter ? examsData : [...examsData].sort(actionQueueSort));
    } catch (requestError) {
      setExams([]);
      setError(
        requestError?.response?.data?.detail ||
          "Não foi possível carregar os exames. Verifique se o back está rodando em http://localhost:8000.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters, quickFilter]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

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

  async function handleOpenNextExam() {
    setError("");
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

    if (nextExam) {
      navigate(`/exams/${nextExam.id}`);
      return;
    }

    setError("Nenhum exame aguardando revisão.");
  }

  const hasSearch = Boolean(filters.search.trim());
  const hasAnyFilter = Boolean(hasSearch || quickFilter);
  const emptyStateCopy = getEmptyStateCopy(quickFilter, hasSearch);
  const openQueue =
    stats != null
      ? Number(stats.pending_total || 0) + Number(stats.in_validation_total || 0)
      : allExams.filter((exam) => exam.status_validation !== "valido").length;

  return (
    <div className="dashboard-page">
      <div className="page-shell">
        <AppHeader />
        <section className="dashboard-action-header" aria-label="Iniciar revisão">
          <div>
            <span className="eyebrow">Fila de trabalho</span>
            <h2>Exames aguardando revisão</h2>
            <p>
              {openQueue > 0
                ? `${openQueue} exames disponíveis. Exames já iniciados têm prioridade.`
                : "Nenhum exame aguardando revisão."}
            </p>
          </div>
          <button
            className="button primary-action"
            type="button"
            onClick={handleOpenNextExam}
            disabled={!openQueue}
          >
            <PlayCircle size={19} aria-hidden="true" />
            Iniciar revisão
          </button>
        </section>
        <div className={`dashboard-workspace${summaryCollapsed ? " summary-collapsed" : ""}`}>
          <main className="dashboard-main">
            <ExamFilters filters={filters} onChange={handleFiltersChange} />
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
                exams={exams}
                emptyTitle={emptyStateCopy.title}
                emptyMessage={emptyStateCopy.message}
              />
            )}
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
    </div>
  );
}
