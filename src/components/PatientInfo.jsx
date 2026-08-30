export default function PatientInfo({ patient }) {
  const rows = [
    ["Nascimento", patient?.birth_date],
    ["Idade", patient?.age ? `${patient.age} anos` : null],
    ["Sexo", patient?.sex],
    ["Peso", patient?.weight ? `${patient.weight} kg` : null],
    [
      "Altura",
      patient?.height
        ? patient.height > 3
          ? `${patient.height} cm`
          : `${patient.height} m`
        : null,
    ],
    ["IMC", patient?.bmi],
  ];

  const availableRows = rows.filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  return (
    <dl className="grid grid-cols-3 rounded-lg bg-muted/40 text-sm">
      {availableRows.map(([label, value]) => (
        <div className="min-w-0 px-2 py-2 sm:px-3" key={label}>
          <dt className="truncate text-xs font-medium text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 whitespace-nowrap text-xs font-medium text-foreground sm:text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
