import { cn } from "@/lib/utils";

function toNumber(value) {
  const number = typeof value === "string" ? Number(value.replace(",", ".")) : value;
  return Number.isFinite(number) ? number : null;
}

// Números clínicos em pt-BR (vírgula decimal), sem arredondar além da precisão que a API manda.
function formatDecimal(value, options) {
  const number = toNumber(value);
  if (number === null) return value;
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2, ...options }).format(number);
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}

// Todos os dados ficam sempre na linha, com "—" quando faltam: peso, altura e IMC desde 2026-10-01 (15 de 20 exames
// vinham sem eles; o biotipo é, com idade e sexo, o que se considera na leitura do traçado — Diretriz SBC 2022, §1.1 —, e
// omitir em silêncio não dizia se faltou o dado ou se a tela não o mostra) e idade, sexo e nascimento desde 2026-10-02,
// para cada dado ter um lugar fixo (ver COLUMN_TEMPLATE).

// Colunas na ordem dos dados. A da idade fica na largura do conteúdo (desde 2026-10-03): com um mínimo pelo maior valor,
// "64 anos calc." — só 4 dos 20 exames têm idade calculada —, nos outros "21 anos" (54px) terminava 58px antes de "Sexo"
// (82px com a nota no rótulo), contra 25–30px entre os demais dados. Agora o espaço depois da idade é o vão, 24px, e só
// no exame com idade calculada os dados seguintes vêm 31px mais à direita. Peso, altura e IMC também (desde a mesma
// data): faltam em 15 dos 20 exames, e com o mínimo pelo maior valor ("107 kg", "174 cm", "35,3 kg/m²") cada "—" deixava
// 54, 43 e 77px até o rótulo seguinte. Sexo e nascimento seguem com largura mínima ("Masculino", "11/03/1961", em `em`
// da letra dos valores): sobram no máximo 6px, e eles ficam no mesmo lugar em todo exame (antes das colunas, numa linha
// corrida, "Sexo" andava 44px do exame 13 para o 16). Estreito (menos que as seis colunas no maior conteúdo de cada uma
// — idade calculada, 5,33em, e 3,75 · 3,5 · 4,75em —, para a forma não depender dos dados), vira uma grade de 3×2 —
// Idade, Sexo, Nascimento sobre Peso, Altura, IMC —, em vez de quebrar a linha onde der e deixar um dado sozinho embaixo.
const COLUMN_TEMPLATE =
  "grid-cols-[max-content_minmax(4.5em,max-content)_minmax(5em,max-content)_max-content_max-content_max-content] @max-[calc(27em+7.5rem)]/clinical-data:grid-cols-[max-content_minmax(4.5em,max-content)_minmax(5em,max-content)]";

function formatHeight(height) {
  const number = toNumber(height);
  if (number !== null && number <= 3) return `${formatDecimal(height, { minimumFractionDigits: 2 })} m`;
  return `${formatDecimal(height)} cm`;
}

export default function PatientInfo({ patient }) {
  // Idade e sexo primeiro: são os dados que mudam a leitura do traçado (limites de QTc e de voltagem).
  // Terceiro item: nota da idade. "calculada" quando a API calculou a idade pela data do exame (a origem não a trouxe);
  // a da origem e a calculada podem divergir. Na tela, "calc." depois do valor ("64 anos calc."); o rótulo fica "Idade"
  // e o leitor de tela ouve "Idade (calculada)". Até 2026-10-03 a nota ficava no rótulo, "Idade (calculada)" (106px),
  // e a coluna da idade era larga por ele em todo exame (ver COLUMN_TEMPLATE).
  const rows = [
    ["Idade", patient?.age ? `${patient.age} anos` : null, patient?.age_calculated ? "calculada" : null],
    ["Sexo", patient?.sex],
    ["Nascimento", patient?.birth_date],
    ["Peso", patient?.weight ? `${formatDecimal(patient.weight)} kg` : null],
    ["Altura", patient?.height ? formatHeight(patient.height) : null],
    ["IMC", patient?.bmi ? `${formatDecimal(patient.bmi)} kg/m²` : null],
  ];

  // Sem nenhum dado, uma frase de status (como a lista vazia dos adicionais): sem ela o espaço ficava vazio, sem dizer
  // se faltou dado ou se não carregou.
  if (!rows.some(([, value]) => hasValue(value))) {
    return <p className="text-sm text-muted-foreground">Nenhum dado clínico neste exame.</p>;
  }

  // Pares rótulo/valor no cartão do exame sobre o ECG (até 2026-09-30, numa grade de 3 colunas num cartão próprio no fim
  // do painel, fora da vista a 1536×730). Sem caixa por item: o cartão já agrupa. Valor em peso 400 (body): é dado de
  // leitura, abaixo do peso do código do exame. O contêiner é o próprio bloco dos dados (a largura que sobra para eles
  // no cartão), e a letra fica nele para o `em` da consulta ser o mesmo das colunas.
  // No tamanho Padrão, letra um passo acima do corpo (desde 2026-10-02): valor em `text-base` (16px) e rótulo em
  // `text-sm` (14px) — é o cabeçalho do traçado, lido a cada diagnóstico, e com 14 e 12px ficava miúdo. No Grande e no
  // Muito grande (`data-text-size` na raiz) os valores já têm 16 e 18px e seguem no corpo: o passo a mais levava a barra a
  // duas linhas a 1536×730 e tirava 5% e 3% da largura do ECG.
  // Na barra compacta (`data-compact-bar`, painel estreito; ver ExamReviewPage) os dados vão numa linha só, sem as
  // colunas, e só com os valores: cada um já diz o que é ("64 anos", "Masculino", a data, "107 kg", "174 cm"). O rótulo
  // fica à vista no IMC (o número sozinho não diz o que é) e nos dados ausentes ("Peso —"); os outros seguem para o
  // leitor de tela. Com o rótulo ao lado de cada valor a linha não cabia no exame 16, nem no Padrão. A idade calculada
  // tem "calc." depois do valor, como na barra normal. Se ainda assim faltar largura, os dados quebram em mais uma linha,
  // sem se sobrepor.
  return (
    <div className="@container/clinical-data text-base in-data-[text-size]:text-sm">
      <dl className={`grid gap-x-6 gap-y-2 ${COLUMN_TEMPLATE} in-data-[compact-bar]:flex in-data-[compact-bar]:flex-wrap in-data-[compact-bar]:gap-x-4 in-data-[compact-bar]:gap-y-0`}>
        {rows.map(([label, value, labelNote]) => (
          <div className="min-w-0 in-data-[compact-bar]:flex in-data-[compact-bar]:shrink-0 in-data-[compact-bar]:items-baseline in-data-[compact-bar]:gap-1" key={label}>
            <dt
              className={cn(
                "text-sm font-medium whitespace-nowrap text-muted-foreground in-data-[text-size]:text-xs",
                label !== "IMC" && hasValue(value) && "in-data-[compact-bar]:sr-only",
              )}
            >
              {label}
              {labelNote ? <span className="sr-only"> ({labelNote})</span> : null}
            </dt>
            <dd className="mt-0.5 whitespace-nowrap text-foreground tabular-nums in-data-[compact-bar]:mt-0">
              {hasValue(value) ? (
                <>
                  {value}
                  {labelNote ? (
                    <span aria-hidden="true" className="text-sm text-muted-foreground in-data-[text-size]:text-xs">
                      {" "}calc.
                    </span>
                  ) : null}
                </>
              ) : (
                // Traço em cinza: o valor presente (em preto) é o que salta. O leitor de tela ouve "não informado".
                <>
                  <span aria-hidden="true" className="text-muted-foreground">
                    —
                  </span>
                  <span className="sr-only">não informado</span>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
