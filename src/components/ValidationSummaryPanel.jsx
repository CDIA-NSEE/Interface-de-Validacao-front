import { PanelRightClose, PanelRightOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup } from "@/components/ui/toggle-group";

import { QUEUE_STATE_META, REFINEMENT_META } from "../utils/queueSemantics.js";
import QuickMetricItem from "./QuickMetricItem.jsx";

function safeNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function selectedValue(key) {
  return key ? [key] : [];
}

const metricTones = {
  all: "secondary",
  completed: "success",
  confirmed: "success",
  rejected: "destructive",
  start: "warning",
  validated: "info",
  with_region: "info",
  without_region: "warning",
};

export default function ValidationSummaryPanel({
  stats,
  collapsed,
  quickFilter,
  refinementFilters,
  onToggleCollapsed,
  onQuickFilter,
  onRefinementFilter,
}) {
  const stateCounts = stats?.queue_state_counts || {};
  const decisionCounts = stats?.decision_counts || {};
  const regionCounts = stats?.region_counts || {};
  const allCount = safeNumber(
    stateCounts.all ?? stats?.pending_total + stats?.in_validation_total + stats?.reviewed_total,
  );
  const stateItems = [
    [QUEUE_STATE_META.all, allCount],
    [QUEUE_STATE_META.start, safeNumber(stateCounts.start)],
    [QUEUE_STATE_META.validated, safeNumber(stateCounts.validated)],
    [QUEUE_STATE_META.completed, safeNumber(stateCounts.completed ?? stats?.reviewed_total)],
  ];
  const decisionItems = [
    [REFINEMENT_META.confirmed, safeNumber(decisionCounts.confirmed)],
    [REFINEMENT_META.rejected, safeNumber(decisionCounts.rejected)],
  ];
  const regionItems = [
    [REFINEMENT_META.with_region, safeNumber(regionCounts.with_region)],
    [REFINEMENT_META.without_region, safeNumber(regionCounts.without_region)],
  ];

  function handleQuickFilterChange(values) {
    const [nextKey] = values;
    if (nextKey && nextKey !== quickFilter?.key) {
      onQuickFilter(nextKey);
    }
  }

  function handleRefinementChange(type, values) {
    const currentKey = refinementFilters?.[type]?.key;
    const [nextKey] = values;

    if (nextKey && nextKey !== currentKey) {
      onRefinementFilter(type, nextKey);
      return;
    }

    if (!nextKey && currentKey) {
      onRefinementFilter(type, currentKey);
    }
  }

  function handleOpenChange(open) {
    if (open !== !collapsed) {
      onToggleCollapsed();
    }
  }

  return (
    <Collapsible
      render={<aside aria-label="Resumo da fila" />}
      className="flex flex-col items-end"
      open={!collapsed}
      onOpenChange={handleOpenChange}
    >
      {collapsed ? (
        <CollapsibleTrigger
          render={<Button type="button" variant="outline" size="icon" />}
          aria-label="Mostrar resumo"
        >
          <PanelRightOpen aria-hidden="true" />
        </CollapsibleTrigger>
      ) : null}

      <CollapsibleContent id="validation-summary-panel" className="w-full">
        <Card size="sm">
          <CardHeader className="border-b bg-accent/60">
            <CardTitle>
              <h2 id="validation-summary-title">Resumo</h2>
            </CardTitle>
            <CardDescription>Filtre rapidamente a fila atual.</CardDescription>
            <CardAction>
              <CollapsibleTrigger
                render={<Button type="button" variant="ghost" size="icon-sm" />}
                aria-label="Ocultar resumo"
              >
                <PanelRightClose aria-hidden="true" />
              </CollapsibleTrigger>
            </CardAction>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <section className="flex flex-col gap-2" aria-labelledby="summary-queue-heading">
              <h3 id="summary-queue-heading" className="text-sm font-medium">
                Exames
              </h3>
              <ToggleGroup
                className="grid w-full grid-cols-2"
                size="sm"
                value={selectedValue(quickFilter?.key || "all")}
                onValueChange={handleQuickFilterChange}
                aria-label="Estado da fila"
              >
                {stateItems.map(([item, count]) => (
                  <QuickMetricItem
                    key={item.key}
                    label={item.label}
                    value={item.key}
                    count={count}
                    title={item.tooltip}
                    ariaLabel={`${item.label}: ${item.tooltip}`}
                    tone={metricTones[item.key]}
                  />
                ))}
              </ToggleGroup>
            </section>

            <Separator />

            <section className="flex flex-col gap-3" aria-labelledby="summary-diagnosis-heading">
              <h3 id="summary-diagnosis-heading" className="text-sm font-medium">
                Diagnósticos
              </h3>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">Decisão</span>
                <ToggleGroup
                  className="grid w-full grid-cols-2"
                  size="sm"
                  value={selectedValue(refinementFilters?.decision?.key)}
                  onValueChange={(values) => handleRefinementChange("decision", values)}
                  aria-label="Decisão do diagnóstico"
                >
                  {decisionItems.map(([item, count]) => (
                    <QuickMetricItem
                      key={item.key}
                      label={item.label}
                      value={item.key}
                      count={count}
                      title={item.tooltip}
                      ariaLabel={`${item.label}: ${item.tooltip}`}
                      tone={metricTones[item.key]}
                    />
                  ))}
                </ToggleGroup>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">Região no ECG</span>
                <ToggleGroup
                  className="grid w-full grid-cols-2"
                  size="sm"
                  value={selectedValue(refinementFilters?.region?.key)}
                  onValueChange={(values) => handleRefinementChange("region", values)}
                  aria-label="Mapeamento de região"
                >
                  {regionItems.map(([item, count]) => (
                    <QuickMetricItem
                      key={item.key}
                      label={item.label}
                      value={item.key}
                      count={count}
                      title={item.tooltip}
                      ariaLabel={`${item.label}: ${item.tooltip}`}
                      tone={metricTones[item.key]}
                    />
                  ))}
                </ToggleGroup>
              </div>
            </section>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
