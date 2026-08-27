import { Button } from "@/components/ui/button.jsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.jsx";

export default function TooltipIconButton({ children, label, type = "button", ...buttonProps }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button aria-label={label} type={type} {...buttonProps} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
