import { X } from "lucide-react";

export default function ActiveFiltersBar({ quickFilter, hasAnyFilter, onClearQuickFilter, onClearAll }) {
  if (!quickFilter && !hasAnyFilter) return null;

  return (
    <section className="active-filters-bar" aria-label="Filtros ativos">
      {quickFilter ? (
        <span className="active-filter-chip">
          Filtro ativo: {quickFilter.label}
          <button type="button" onClick={onClearQuickFilter} aria-label="Limpar filtro rápido">
            <X size={14} aria-hidden="true" />
          </button>
        </span>
      ) : null}

      {hasAnyFilter ? (
        <button className="clear-filters-button" type="button" onClick={onClearAll}>
          Limpar filtros
        </button>
      ) : null}
    </section>
  );
}

