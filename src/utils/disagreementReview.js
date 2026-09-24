// Justificativa como é salva e comparada: sem espaços no fim das linhas, no máximo uma linha em branco entre
// parágrafos e nada antes ou depois do texto. Espaços e enters sobrando são invisíveis, não acrescentam nada e só
// aumentavam a caixa salva; texto só de espaços vira vazio (não há justificativa). Aplicada ao salvar e ao decidir se
// o rascunho mudou — nunca enquanto o médico digita, para não brigar com o cursor.
export function normalizeReviewNote(note) {
  return (note ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function hasDisagreementNote(note) {
  return typeof note === "string" && note.trim().length > 0;
}
