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
    <dl className="info-list clinical-info-list">
      {rows
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}
