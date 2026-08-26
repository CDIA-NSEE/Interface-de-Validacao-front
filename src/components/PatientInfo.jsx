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

  return (
    <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
      {rows
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .map(([label, value]) => (
          <div className="rounded-lg bg-muted/50 p-3" key={label}>
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-medium text-foreground">{value}</dd>
          </div>
        ))}
    </dl>
  );
}
