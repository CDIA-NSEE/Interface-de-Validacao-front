import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  ShieldCheck,
  Timer,
} from "lucide-react";

import ClinicalResultBar from "./ClinicalResultBar.jsx";
import StatsGroup from "./StatsGroup.jsx";

function safeNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export default function StatsCards({ stats }) {
  const stateCounts = stats?.queue_state_counts || {};
  const startTotal = safeNumber(stateCounts.start ?? safeNumber(stats?.pending_total) + safeNumber(stats?.in_validation_total));
  const validatedTotal = safeNumber(stateCounts.validated);
  const completedTotal = safeNumber(stateCounts.completed ?? stats?.reviewed_total);
  const reviewedTotal = safeNumber(stats?.reviewed_total);
  const validWithChange = safeNumber(stats?.valid_with_change);
  const openQueue = startTotal + validatedTotal;
  const alteredPercent = percent(validWithChange, reviewedTotal);
  const validWithoutChange = safeNumber(stats?.valid_without_change);

  const statsGroups = [
    {
      title: "Fila de trabalho",
      summary:
        openQueue > 0
          ? `${openQueue} exames em fluxo`
          : "Nenhum exame em fluxo",
      summaryTone: "start",
      cards: [
        ["start_total", "Iniciar", ClipboardList, "start", startTotal],
        ["validated_total", "Em Validação", Timer, "validated", validatedTotal],
      ],
    },
    {
      title: "Produtividade",
      summary: "Hoje e semana atual",
      summaryTone: "neutral",
      cards: [
        ["reviewed_today", "Concluídos hoje", CheckCircle2, "completed", safeNumber(stats?.reviewed_today)],
        ["reviewed_week", "Concluídos na semana", CalendarCheck, "completed", safeNumber(stats?.reviewed_week)],
        ["reviewed_total", "Total concluído", FileCheck2, "completed", completedTotal],
      ],
    },
    {
      title: "Resultado dos concluídos",
      summary:
        reviewedTotal > 0
          ? `${validWithChange} de ${reviewedTotal} concluídos apresentaram alteração - ${alteredPercent}%`
          : "Sem exames concluídos para análise de resultado",
      summaryTone: "neutral",
      footer: (
        <ClinicalResultBar
          withoutChange={validWithoutChange}
          withChange={validWithChange}
          reviewedTotal={reviewedTotal}
        />
      ),
      cards: [
        ["valid_without_change", "Sem alteração", ShieldCheck, "success", validWithoutChange],
        ["valid_with_change", "Alterados", AlertTriangle, "clinical-alert", validWithChange],
      ],
    },
  ];

  return (
    <section className="stats-groups-grid" aria-label="Indicadores agrupados">
      {statsGroups.map((group) => (
        <StatsGroup
          title={group.title}
          summary={group.summary}
          summaryTone={group.summaryTone}
          footer={group.footer}
          key={group.title}
        >
          {group.cards.map(([key, label, Icon, tone, value]) => (
            <article className={`stat-card stat-card-${tone}`} key={key}>
              <div className="stat-icon" aria-hidden="true">
                <Icon size={20} />
              </div>
              <span>{label}</span>
              <strong>{safeNumber(value ?? stats?.[key])}</strong>
            </article>
          ))}
        </StatsGroup>
      ))}
    </section>
  );
}
