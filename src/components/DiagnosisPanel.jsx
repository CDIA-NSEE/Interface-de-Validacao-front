import { MapPinned, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export default function DiagnosisPanel({
  diagnoses = [],
  onAdd,
  onRemove,
  isBusy,
  selectedRegion,
  onRegionConsumed,
}) {
  const [name, setName] = useState("");
  const [isAbnormal, setIsAbnormal] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const wasAdded = await onAdd({
      name: trimmedName,
      is_abnormal: isAbnormal,
      region_x: selectedRegion?.x ?? null,
      region_y: selectedRegion?.y ?? null,
      region_width: selectedRegion?.width ?? null,
      region_height: selectedRegion?.height ?? null,
    });

    if (wasAdded) {
      setName("");
      setIsAbnormal(false);
      onRegionConsumed?.();
    }
  }

  return (
    <div className="diagnosis-panel">
      <div className="diagnosis-list">
        {diagnoses.length ? (
          diagnoses.map((diagnosis) => (
            <div className="diagnosis-item" key={diagnosis.id}>
              <div>
                <strong>{diagnosis.name}</strong>
                <span>{diagnosis.is_abnormal ? "Alteração" : "Sem alteração"}</span>
                {diagnosis.region_width && diagnosis.region_height ? (
                  <span className="diagnosis-region">
                    <MapPinned size={14} aria-hidden="true" />
                    Região ECG vinculada
                  </span>
                ) : null}
              </div>
              <button
                className="icon-button danger-icon"
                type="button"
                onClick={() => onRemove(diagnosis.id)}
                disabled={isBusy}
                aria-label={`Remover ${diagnosis.name}`}
                title="Remover diagnóstico"
              >
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </div>
          ))
        ) : (
          <span className="muted-text">Nenhum diagnóstico registrado.</span>
        )}
      </div>

      <form className="diagnosis-form" onSubmit={handleSubmit}>
        <label>
          Novo diagnóstico
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Taquicardia sinusal"
          />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={isAbnormal}
            onChange={(event) => setIsAbnormal(event.target.checked)}
          />
          Marcar como alteração
        </label>
        {selectedRegion ? (
          <div className="region-ready">
            <MapPinned size={16} aria-hidden="true" />
            Região selecionada para o próximo diagnóstico
          </div>
        ) : null}
        <button className="button secondary full-width-button" type="submit" disabled={isBusy}>
          <Plus size={17} aria-hidden="true" />
          Adicionar
        </button>
      </form>
    </div>
  );
}
