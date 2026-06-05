export default function PatientInfo({ patient }) {
  const rows = [
    ["Paciente", patient?.name],
    ["Idade", patient?.age ? `${patient.age} anos` : null],
    ["Sexo", patient?.sex],
    ["Peso", patient?.weight ? `${patient.weight} kg` : null],
    ["Altura", patient?.height ? `${patient.height} m` : null],
    ["IMC", patient?.bmi],
  ];

  return (
    <dl className="info-list">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value ?? "-"}</dd>
        </div>
      ))}
    </dl>
  );
}

