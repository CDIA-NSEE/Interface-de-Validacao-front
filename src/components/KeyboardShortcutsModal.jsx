import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

// Os mesmos atalhos que EcgViewer (+ − 0 setas V Esc) e os campos de texto (Ctrl+Enter) tratam — mudou lá, muda aqui.
const SHORTCUT_GROUPS = [
  {
    id: "ecg",
    title: "Traçado do ECG",
    shortcuts: [
      { keys: ["+"], label: "Aumentar zoom" },
      { keys: ["−"], label: "Diminuir zoom" },
      { keys: ["0"], label: "Restaurar visualização" },
      { keys: ["← ↑ ↓ →"], label: "Mover o traçado ampliado" },
      { keys: ["Shift", "← ↑ ↓ →"], label: "Mover meia tela" },
      { keys: ["V"], label: "Ocultar ou mostrar marcações" },
      { keys: ["Esc"], label: "Cancelar a marcação ou desmarcar a área" },
    ],
  },
  {
    id: "text-fields",
    title: "Campos de texto",
    shortcuts: [{ keys: ["Ctrl", "Enter"], label: "Salvar observações ou justificativa" }],
  },
];

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pr-10">
          <DialogTitle>Atalhos de teclado</DialogTitle>
          <DialogDescription>
            Os atalhos do traçado valem com o ponteiro sobre o ECG e fora dos campos de texto;
            as setas, depois de clicar no ECG.
          </DialogDescription>
        </DialogHeader>
        {SHORTCUT_GROUPS.map((group) => (
          <section aria-labelledby={`shortcuts-${group.id}`} className="flex flex-col gap-1" key={group.id}>
            <h3 className="text-sm font-medium text-muted-foreground" id={`shortcuts-${group.id}`}>
              {group.title}
            </h3>
            <dl className="flex flex-col">
              {group.shortcuts.map((shortcut) => (
                <div
                  className="flex items-center justify-between gap-4 border-b py-2 last:border-b-0"
                  key={shortcut.label}
                >
                  <dt className="text-sm">{shortcut.label}</dt>
                  <dd className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    {shortcut.keys.map((key, index) => (
                      <span className="contents" key={key}>
                        {index > 0 ? "+" : null}
                        <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border bg-muted px-1.5 font-sans text-xs font-medium text-foreground">
                          {key}
                        </kbd>
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </DialogContent>
    </Dialog>
  );
}
