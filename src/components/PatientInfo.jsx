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

// Colunas de largura mínima fixa, na ordem dos dados: cada um cai no mesmo lugar em todo exame — antes, numa linha
// corrida, "Sexo" andava 44px do exame 13 para o 16 conforme a idade era "calculada" ou não. Mínimos em `em` da letra
// dos valores (crescem com o tamanho do texto), pelo maior conteúdo de cada coluna nos 20 exames do banco: "Idade
// (calculada)", "Masculino", "11/03/1961", "107 kg", "174 cm", "35,3 kg/m²" (a da idade é a do rótulo, uma letra menor
// que o valor: 7em para caber nos três tamanhos de texto). Um valor mais longo alarga a coluna em vez de ser cortado. Estreito (menos que as seis colunas), vira uma grade de 3×2 — Idade, Sexo, Nascimento sobre Peso,
// Altura, IMC —, em vez de quebrar a linha onde der e deixar um dado sozinho embaixo.
const COLUMN_TEMPLATE =
  "grid-cols-[minmax(7em,max-content)_minmax(4.5em,max-content)_minmax(5em,max-content)_minmax(3.75em,max-content)_minmax(3.5em,max-content)_minmax(4.75em,max-content)] @max-[calc(28.5em+7.5rem)]/clinical-data:grid-cols-[minmax(7em,max-content)_minmax(4.5em,max-content)_minmax(5em,max-content)]";

function formatHeight(height) {
  const number = toNumber(height);
  if (number !== null && number <= 3) return `${formatDecimal(height, { minimumFractionDigits: 2 })} m`;
  return `${formatDecimal(height)} cm`;
}

export default function PatientInfo({ patient }) {
  // Idade e sexo primeiro: são os dados que mudam a leitura do traçado (limites de QTc e de voltagem).
  // Terceiro item: nota do rótulo. "calculada" quando a API calculou a idade pela data do exame (a origem não a trouxe)
  // — no rótulo, não no valor, para não alargar a coluna; a da origem e a calculada podem divergir.
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
  return (
    <div className="@container/clinical-data text-base in-data-[text-size]:text-sm">
      <dl className={`grid gap-x-6 gap-y-2 ${COLUMN_TEMPLATE}`}>
        {rows.map(([label, value, labelNote]) => (
          <div className="min-w-0" key={label}>
            <dt className="text-sm font-medium whitespace-nowrap text-muted-foreground in-data-[text-size]:text-xs">
              {label}
              {labelNote ? <span className="font-normal"> ({labelNote})</span> : null}
            </dt>
            <dd className="mt-0.5 whitespace-nowrap text-foreground tabular-nums">
              {hasValue(value) ? (
                value
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
