import { InboxIcon } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.jsx";

export default function EmptyState({ title = "Nenhum registro encontrado", message }) {
  return (
    <Empty className="min-h-40 border border-border bg-card/60">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InboxIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {message ? <EmptyDescription>{message}</EmptyDescription> : null}
      </EmptyHeader>
    </Empty>
  );
}
