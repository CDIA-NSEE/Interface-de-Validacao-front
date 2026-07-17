import { X } from "lucide-react";

export default function ActiveFiltersBar({
  quickFilter,
  refinementFilters,
  searchValue,
  hasAnyFilter,
  onClearQuickFilter,
  onClearRefinement,
  onClearSearch,
  onClearAll,
}) {
  const activeRefinements = Object.entries(refinementFilters || {}).filter(([, filter]) => filter);
  const activeSearch = searchValue?.trim();
  const hasStateContext = Boolean(quickFilter);

  if (!hasStateContext && !hasAnyFilter && activeRefinements.length === 0) return null;

  return (
    <section className="active-filters-bar" aria-label="Filtros ativos">
      {quickFilter ? (
        <span className={`active-filter-chip active-filter-chip-${quickFilter.tone || "state-start"}`}>
          Exames: {quickFilter.label}
          {quickFilter.key !== "all" ? (
            <button type="button" onClick={onClearQuickFilter} aria-label="Limpar exames">
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </span>
      ) : null}

      {activeSearch ? (
        <span className="active-filter-chip active-filter-chip-state-all">
          Busca: {activeSearch}
          <button type="button" onClick={onClearSearch} aria-label="Limpar busca">
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
        <button
          className="clear-filters-button"
          type="button"
          onClick={onClearAll}
          aria-label="Limpar todos os filtros"
          title="Limpar todos os filtros"
        >
          Limpar filtros
        </button>
      ) : null}
    </section>
  );
}
