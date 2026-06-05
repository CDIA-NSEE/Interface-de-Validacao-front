import EmptyState from "./EmptyState.jsx";
import ExamCard from "./ExamCard.jsx";

export default function ExamList({ exams }) {
  if (!exams?.length) {
    return (
      <EmptyState
        title="Nenhum exame encontrado"
        message="Ajuste os filtros ou a busca para ampliar a lista."
      />
    );
  }

  return (
    <section className="exam-list" aria-label="Lista de exames">
      {exams.map((exam) => (
        <ExamCard key={exam.id} exam={exam} />
      ))}
    </section>
  );
}

