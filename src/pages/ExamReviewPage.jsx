import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import DiagnosisPanel from "../components/DiagnosisPanel.jsx";
import EcgViewer from "../components/EcgViewer.jsx";
import EmptyState from "../components/EmptyState.jsx";
import LoadingState from "../components/LoadingState.jsx";
import PatientInfo from "../components/PatientInfo.jsx";
import ReviewActions from "../components/ReviewActions.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import {
  addDiagnosis,
  getExamById,
  removeDiagnosis,
  updateExamStatus,
  validateExam,
} from "../services/examsService.js";
import { formatDate } from "../utils/dateUtils.js";

const DOCTOR_NAME = "Dr. João";

export default function ExamReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [notes, setNotes] = useState("");
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadExam = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const examData = await getExamById(id);
      setSelectedRegion(null);
      if (examData.status_validation === "nao_validado") {
        const updatedExam = await updateExamStatus(id, "em_validacao");
        setExam(updatedExam);
      } else {
        setExam(examData);
      }
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          "Não foi possível carregar o exame selecionado.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  async function runAction(action, successMessage) {
    setIsBusy(true);
    setError("");
    setMessage("");
    try {
      const updatedExam = await action();
      if (updatedExam) {
        setExam(updatedExam);
      }
      setMessage(successMessage);
      return true;
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "Não foi possível concluir a ação.");
      return false;
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAddDiagnosis(payload) {
    return runAction(async () => {
      const diagnosis = await addDiagnosis(id, payload);
      return {
        ...exam,
        diagnoses: [...(exam?.diagnoses || []), diagnosis],
      };
    }, "Diagnóstico adicionado.");
  }

  async function handleRemoveDiagnosis(diagnosisId) {
    await runAction(async () => {
      await removeDiagnosis(id, diagnosisId);
      return {
        ...exam,
        diagnoses: exam.diagnoses.filter((diagnosis) => diagnosis.id !== diagnosisId),
      };
    }, "Diagnóstico removido.");
  }

  function handleSaveInValidation() {
    runAction(
      () => updateExamStatus(id, "em_validacao"),
      "Exame salvo como em validação.",
    );
  }

  function handleValidate(reviewResult) {
    runAction(
      () =>
        validateExam(id, {
          review_result: reviewResult,
          notes,
          doctor_name: DOCTOR_NAME,
        }),
      reviewResult === "alterado"
        ? "Exame validado como alterado."
        : "Exame validado sem alteração.",
    );
  }

  if (isLoading) {
    return <LoadingState message="Abrindo exame..." />;
  }

  if (error && !exam) {
    return (
      <div className="page-shell narrow-shell">
        <EmptyState title="Exame indisponível" message={error} />
        <button className="button secondary" type="button" onClick={() => navigate("/")}>
          <ArrowLeft size={17} aria-hidden="true" />
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="review-page">
      <header className="review-topbar">
        <div>
          <span className="eyebrow">Revisão médica</span>
          <h1>Exame {exam.exam_code}</h1>
        </div>
        <StatusBadge status={exam.status_validation} reviewResult={exam.review_result} />
      </header>

      <main className="review-layout">
        <aside className="review-sidebar">
          {message ? <div className="feedback success-feedback">{message}</div> : null}
          {error ? <div className="feedback error-feedback">{error}</div> : null}

          <section className="sidebar-section">
            <h2>Dados do exame</h2>
            <dl className="info-list">
              <div>
                <dt>Exame</dt>
                <dd>{exam.exam_code}</dd>
              </div>
              <div>
                <dt>Data</dt>
                <dd>{formatDate(exam.exam_date)}</dd>
              </div>
              <div>
                <dt>Categoria</dt>
                <dd>{exam.category}</dd>
              </div>
              <div>
                <dt>Tipo</dt>
                <dd>{exam.exam_type}</dd>
              </div>
            </dl>
          </section>

          <section className="sidebar-section">
            <h2>Dados do paciente</h2>
            <PatientInfo patient={exam.patient} />
          </section>

          <section className="sidebar-section">
            <h2>Diagnósticos</h2>
            <DiagnosisPanel
              diagnoses={exam.diagnoses}
              onAdd={handleAddDiagnosis}
              onRemove={handleRemoveDiagnosis}
              isBusy={isBusy}
              selectedRegion={selectedRegion}
              onRegionConsumed={() => setSelectedRegion(null)}
            />
          </section>

          <section className="sidebar-section">
            <h2>Observações</h2>
            <textarea
              className="notes-field"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Registre observações da revisão"
              rows={5}
            />
          </section>

          <section className="sidebar-section">
            <h2>Status atual</h2>
            <StatusBadge status={exam.status_validation} reviewResult={exam.review_result} />
          </section>

          <ReviewActions
            onBack={() => navigate("/")}
            onSave={handleSaveInValidation}
            onValidateWithoutChange={() => handleValidate("sem_alteracao")}
            onValidateChanged={() => handleValidate("alterado")}
            isBusy={isBusy}
            isValid={exam.status_validation === "valido"}
          />
        </aside>

        <section className="review-viewer" aria-label="Visualizador de ECG">
          <EcgViewer
            imageUrl={exam.image_url}
            selectedRegion={selectedRegion}
            onRegionChange={setSelectedRegion}
          />
        </section>
      </main>
    </div>
  );
}
