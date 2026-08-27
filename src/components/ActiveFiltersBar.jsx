import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const refinementVariants = {
  confirmed: "success",
  rejected: "destructive",
  with_region: "info",
  without_region: "warning",
};

const queueVariants = {
  all: "secondary",
  start: "warning",
  validated: "info",
  completed: "success",
};

function RemovableFilterBadge({ children, label, onRemove, variant }) {
  return (
    <Badge
      render={<button type="button" onClick={onRemove} aria-label={label} />}
      variant={variant}
    >
      {children}
      <X data-icon="inline-end" aria-hidden="true" />
    </Badge>
  );
}

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
    <section className="flex min-w-0 flex-wrap items-center gap-2" aria-label="Filtros ativos">
      {quickFilter ? (
        quickFilter.key === "all" ? (
          <Badge variant={queueVariants[quickFilter.key]}>Exames: {quickFilter.label}</Badge>
        ) : (
          <RemovableFilterBadge
            label="Limpar exames"
            onRemove={onClearQuickFilter}
            variant={queueVariants[quickFilter.key] || "secondary"}
          >
            Exames: {quickFilter.label}
          </RemovableFilterBadge>
        )
      ) : null}

      {activeSearch ? (
        <RemovableFilterBadge
          label="Limpar busca"
          onRemove={onClearSearch}
          variant="secondary"
        >
          Busca: {activeSearch}
        </RemovableFilterBadge>
      ) : null}

      {activeRefinements.map(([type, filter]) => (
        <RemovableFilterBadge
          key={`${type}-${filter.key}`}
          label={`Limpar filtro ${filter.label}`}
          onRemove={() => onClearRefinement(type)}
          variant={refinementVariants[filter.key] || "secondary"}
        >
          {filter.label}
        </RemovableFilterBadge>
      ))}

      {hasAnyFilter ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onClearAll}
          aria-label="Limpar todos os filtros"
        >
          Limpar filtros
        </Button>
      ) : null}
    </section>
  );
}
