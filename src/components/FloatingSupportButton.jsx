import { LifeBuoy } from "lucide-react";

export default function FloatingSupportButton({ onClick }) {
  return (
    <button
      aria-label="Relatar problema"
      className="floating-support-button"
      onClick={onClick}
      title="Relatar problema"
      type="button"
    >
      <LifeBuoy size={20} aria-hidden="true" />
      <span>Relatar problema</span>
    </button>
  );
}
