"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn("relative", className)} {...props}>
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1">
        {/* Content observa o tamanho do CONTEÚDO (o viewport só observa o próprio): sem ele, o Base UI não recalcula o
            overflow quando o conteúdo cresce sozinho — abrir um diagnóstico ou "Mais informações" deixava a área rolável
            sem barra nenhuma até o primeiro scroll (a nativa está desligada no viewport), que é justamente quando o sinal
            de "há mais abaixo" faz falta. */}
        <ScrollAreaPrimitive.Content data-slot="scroll-area-content">
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        // Trilho discreto (bg-muted/50): mostra a extensão total da área rolável, não só a posição atual.
        "group/scrollbar flex touch-none bg-muted/50 p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent",
        className
      )}
      {...props}>
      {/* `bg-border` dava 1,4:1 sobre o cartão branco e passava despercebido; muted-foreground/70 dá 3,1:1 (mínimo do
          WCAG 1.4.11 para componentes não textuais) nos dois temas, e escurece enquanto o ponteiro está na área ou o
          conteúdo rola. */}
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-muted-foreground/70 transition-colors group-data-[hovering]/scrollbar:bg-muted-foreground/90 group-data-[scrolling]/scrollbar:bg-muted-foreground/90 motion-reduce:transition-none" />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar }
