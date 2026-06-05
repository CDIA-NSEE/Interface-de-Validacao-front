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
  category: "",
  exam_type: "",
  status: "",
  source: "all",
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
  reviewed_today: {
    key: "reviewed_today",
    label: "Revisados hoje",
    // TODO: aplicar filtro temporal diário quando o endpoint /exams suportar data de revisão.
    filters: { status: "valido", review_result: "" },
  },
  reviewed_week: {
    key: "reviewed_week",
    label: "Revisões na semana",
    // TODO: aplicar filtro temporal semanal quando o endpoint /exams suportar data de revisão.
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

function uniqueOptions(exams, key) {
  return [...new Set(exams.map((exam) => exam[key]).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(initialFilters);
  const [quickFilter, setQuickFilter] = useState(null);
  const [stats, setStats] = useState(null);
  const [exams, setExams] = useState([]);
  const [allExams, setAllExams] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    examTypes: [],
  });
  const [summaryCollapsed, setSummaryCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = window.localStorage.getItem("summaryPanelCollapsed");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(max-width: 920px)").matches;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    window.localStorage.setItem("summaryPanelCollapsed", String(summaryCollapsed));
  }, [summaryCollapsed]);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const statsData = await getStats();
      setStats(statsData);
    } catch (requestError) {
      setStats(null);
      setError(
        requestError?.response?.data?.detail ||
          "A API não respondeu em http://localhost:8000. Inicie o back para carregar métricas e exames.",
      );
    }

    try {
      const allExamsData = await getExams();
      setAllExams(allExamsData);
      setFilterOptions({
        categories: uniqueOptions(allExamsData, "category"),
        examTypes: uniqueOptions(allExamsData, "exam_type"),
      });
    } catch {
      setAllExams([]);
      setFilterOptions({
        categories: [],
        examTypes: [],
      });
    }

    try {
      const examsData = await getExams(filters);
      setExams(examsData);
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
    loadDashboard();
  }, [loadDashboard]);

  function handleFiltersChange(nextFilters) {
    const quickFieldsChanged =
      nextFilters.status !== filters.status ||
      nextFilters.review_result !== filters.review_result ||
      nextFilters.source !== filters.source;

    if (quickFieldsChanged) {
      setQuickFilter(null);
    }

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
      source: "all",
      review_result: "",
    }));
  }

  function clearAllFilters() {
    setQuickFilter(null);
    setFilters(initialFilters);
  }

  async function handleOpenNextExam() {
    setError("");
    const inValidationExam = allExams.find((exam) => exam.status_validation === "em_validacao");
    const pendingExam = allExams.find((exam) => exam.status_validation === "nao_validado");
    let nextExam = inValidationExam || pendingExam;

    if (!nextExam) {
      const [inValidationExams, pendingExams] = await Promise.all([
        getExams({ status: "em_validacao" }),
        getExams({ status: "nao_validado" }),
      ]);
      nextExam = inValidationExams[0] || pendingExams[0];
    }

    if (nextExam) {
      navigate(`/exams/${nextExam.id}`);
      return;
    }

    setError("Nenhum exame aguardando finalização.");
  }

  const hasAnyFilter = Boolean(
    filters.search ||
      filters.category ||
      filters.exam_type ||
      filters.status ||
      filters.review_result ||
      (filters.source && filters.source !== "all"),
  );

  return (
    <div className="dashboard-page">
      <div className="page-shell">
        <AppHeader />
        <div className={`dashboard-workspace${summaryCollapsed ? " summary-collapsed" : ""}`}>
          <main className="dashboard-main">
            <ExamFilters
              filters={filters}
              onChange={handleFiltersChange}
              categoryOptions={filterOptions.categories}
              examTypeOptions={filterOptions.examTypes}
            />
            <ActiveFiltersBar
              quickFilter={quickFilter}
              hasAnyFilter={hasAnyFilter}
              onClearQuickFilter={clearQuickFilter}
              onClearAll={clearAllFilters}
            />

            {error ? <EmptyState title="Erro ao carregar" message={error} /> : null}
            {isLoading ? <LoadingState message="Buscando exames..." /> : <ExamList exams={exams} />}
          </main>

          <aside className="summary-sidebar">
            <ValidationSummaryPanel
              stats={stats}
              collapsed={summaryCollapsed}
              quickFilter={quickFilter}
              onToggleCollapsed={() => setSummaryCollapsed((current) => !current)}
              onQuickFilter={applyQuickFilter}
              onOpenNextExam={handleOpenNextExam}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
