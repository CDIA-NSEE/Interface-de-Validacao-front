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

function formatHeight(height) {
  const number = toNumber(height);
  if (number !== null && number <= 3) return `${formatDecimal(height, { minimumFractionDigits: 2 })} m`;
  return `${formatDecimal(height)} cm`;
}

export default function PatientInfo({ patient }) {
  // Idade e sexo primeiro: são os dados que mudam a leitura do traçado (limites de QTc e de voltagem).
  const rows = [
    ["Idade", patient?.age ? `${patient.age} anos` : null],
    ["Sexo", patient?.sex],
    ["Nascimento", patient?.birth_date],
    ["Peso", patient?.weight ? `${formatDecimal(patient.weight)} kg` : null],
    ["Altura", patient?.height ? formatHeight(patient.height) : null],
    ["IMC", patient?.bmi ? `${formatDecimal(patient.bmi)} kg/m²` : null],
  ];

  const availableRows = rows.filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  // Sem nenhum dado, uma frase de status (como a lista vazia dos adicionais): sem ela o cartão ficava só com o título.
  if (availableRows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum dado clínico neste exame.</p>;
  }

  // Lista de pares rótulo/valor sem caixa por item: o cartão já agrupa (caixa dentro do cartão era cartão dentro de cartão).
  // Valor em peso 400 (body): é dado de leitura; 500 é o peso dos controles e do título da seção, que assim fica acima.
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
      {availableRows.map(([label, value]) => (
        <div className="min-w-0" key={label}>
          <dt className="truncate text-xs font-medium text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 whitespace-nowrap text-xs text-foreground tabular-nums sm:text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
