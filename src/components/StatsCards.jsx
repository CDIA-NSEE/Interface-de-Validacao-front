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
  const pendingTotal = safeNumber(stats?.pending_total);
  const inValidationTotal = safeNumber(stats?.in_validation_total);
  const reviewedTotal = safeNumber(stats?.reviewed_total);
  const validWithChange = safeNumber(stats?.valid_with_change);
  const openQueue = pendingTotal + inValidationTotal;
  const alteredPercent = percent(validWithChange, reviewedTotal);
  const validWithoutChange = safeNumber(stats?.valid_without_change);

  const statsGroups = [
    {
      title: "Fila de trabalho",
      summary:
        openQueue > 0
          ? `${openQueue} exames aguardam finalização`
          : "Nenhum exame aguardando finalização",
      summaryTone: "pending",
      cards: [
        ["pending_total", "Pendentes", ClipboardList, "pending"],
        ["in_validation_total", "Em validação", Timer, "in-validation"],
      ],
    },
    {
      title: "Produtividade",
      summary: "Hoje e semana atual",
      summaryTone: "neutral",
      cards: [
        ["reviewed_today", "Revisados hoje", CheckCircle2, "productivity"],
        ["reviewed_week", "Revisões na semana", CalendarCheck, "productivity"],
        ["reviewed_total", "Total revisado", FileCheck2, "productivity"],
      ],
    },
    {
      title: "Resultado dos revisados",
      summary:
        reviewedTotal > 0
          ? `${validWithChange} de ${reviewedTotal} revisados apresentaram alteração — ${alteredPercent}%`
          : "Sem exames revisados para análise de resultado",
      summaryTone: "neutral",
      footer: (
        <ClinicalResultBar
          withoutChange={validWithoutChange}
          withChange={validWithChange}
          reviewedTotal={reviewedTotal}
        />
      ),
      cards: [
        ["valid_without_change", "Sem alteração", ShieldCheck, "success"],
        ["valid_with_change", "Alterados", AlertTriangle, "clinical-alert"],
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
          {group.cards.map(([key, label, Icon, tone]) => (
            <article className={`stat-card stat-card-${tone}`} key={key}>
              <div className="stat-icon" aria-hidden="true">
                <Icon size={20} />
              </div>
              <span>{label}</span>
              <strong>{safeNumber(stats?.[key])}</strong>
            </article>
          ))}
        </StatsGroup>
      ))}
    </section>
  );
}
