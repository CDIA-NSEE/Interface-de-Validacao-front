export function hasDisagreementNote(note) {
  return typeof note === "string" && note.trim().length > 0;
}
