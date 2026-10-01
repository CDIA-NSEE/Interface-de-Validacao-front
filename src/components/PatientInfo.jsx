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

// Peso, altura e IMC ficam sempre na linha, com "—" quando faltam (em 2026-10-01, 15 de 20 exames vinham sem eles): o
// biotipo é, com idade e sexo, o que se considera na leitura do traçado (Diretriz SBC 2022, §1.1; muda a voltagem do
// QRS), e omitir em silêncio não dizia se faltou o dado ou se a tela não o mostra.
const ALWAYS_SHOWN = new Set(["Peso", "Altura", "IMC"]);

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

  const visibleRows = rows.filter(([label, value]) => hasValue(value) || ALWAYS_SHOWN.has(label));

  // Sem nenhum dado, uma frase de status (como a lista vazia dos adicionais): sem ela o espaço ficava vazio, sem dizer
  // se faltou dado ou se não carregou.
  if (!rows.some(([, value]) => hasValue(value))) {
    return <p className="text-sm text-muted-foreground">Nenhum dado clínico neste exame.</p>;
  }

  // Pares rótulo/valor numa linha só, no cartão do exame sobre o ECG (até 2026-09-30, numa grade de 3 colunas num cartão
  // próprio no fim do painel, fora da vista a 1536×730). Sem caixa por item: o cartão já agrupa. Valor em peso 400
  // (body): é dado de leitura, abaixo do peso do código do exame.
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      {visibleRows.map(([label, value, labelNote]) => (
        <div className="min-w-0" key={label}>
          <dt className="text-xs font-medium whitespace-nowrap text-muted-foreground">
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
  );
}
