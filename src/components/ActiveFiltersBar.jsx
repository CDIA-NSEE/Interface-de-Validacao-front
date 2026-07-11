import { X } from "lucide-react";

export default function ActiveFiltersBar({
  quickFilter,
  refinementFilters,
  hasAnyFilter,
  onClearQuickFilter,
  onClearRefinement,
  onClearAll,
}) {
  const activeRefinements = Object.entries(refinementFilters || {}).filter(([, filter]) => filter);

  if (!hasAnyFilter && activeRefinements.length === 0) return null;

  return (
    <section className="active-filters-bar" aria-label="Filtros ativos">
      {quickFilter && quickFilter.key !== "start" ? (
        <span className={`active-filter-chip active-filter-chip-${quickFilter.tone || "state-start"}`}>
          Estado: {quickFilter.label}
          <button type="button" onClick={onClearQuickFilter} aria-label="Limpar estado">
            <X size={14} aria-hidden="true" />
          </button>
        </span>
      ) : null}

      {activeRefinements.map(([type, filter]) => (
        <span
          className={`active-filter-chip active-filter-chip-${filter.tone || "state-all"}`}
          key={`${type}-${filter.key}`}
        >
          {filter.label}
          <button
            type="button"
            onClick={() => onClearRefinement(type)}
            aria-label={`Limpar filtro ${filter.label}`}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </span>
      ))}

      {hasAnyFilter ? (
        <button className="clear-filters-button" type="button" onClick={onClearAll}>
          Limpar filtros
        </button>
      ) : null}
    </section>
  );
}
