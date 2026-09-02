import { cn } from "@/lib/utils";

export default function ValidationPanelIconLabel({ children, className, icon: Icon }) {
  return (
    <span
      className={cn("flex min-w-0 items-center gap-2", className)}
      data-slot="validation-panel-icon-label"
    >
      <span
        aria-hidden="true"
        className="grid size-5 shrink-0 place-items-center"
        data-slot="validation-panel-icon"
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0">{children}</span>
    </span>
  );
}
