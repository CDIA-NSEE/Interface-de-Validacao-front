import { REVIEW_RESULT_OPTIONS, STATUS_OPTIONS } from "../utils/statusLabels.js";

export default function AdvancedFilters({ filters, onChange }) {
  function updateFilter(event) {
    const { name, value } = event.target;
    const nextFilters = { ...filters, [name]: value };

    if (name === "status" && value !== "valido") {
      nextFilters.review_result = "";
    }

    onChange(nextFilters);
  }

  const resultDisabled = filters.status !== "valido";

  return (
    <div className="advanced-filters-panel" id="advanced-filters">
      <label>
        Status
        <select name="status" value={filters.status} onChange={updateFilter}>
          <option value="">Todos</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Origem
        <select name="source" value={filters.source} onChange={updateFilter}>
          <option value="all">Todos</option>
          <option value="pending">Exames pendentes</option>
          <option value="reviewed">Exames revisados</option>
        </select>
      </label>

      <label>
        Resultado
        <select
          name="review_result"
          value={filters.review_result}
          onChange={updateFilter}
          disabled={resultDisabled}
        >
          <option value="">Todos</option>
          {REVIEW_RESULT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

