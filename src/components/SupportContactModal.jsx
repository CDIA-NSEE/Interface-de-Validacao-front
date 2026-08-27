import { Mail, MessageCircle, Phone } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item.jsx";

const CHANNEL_ICONS = {
  email: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  text: MessageCircle,
};

export default function SupportContactModal({ contact, isOpen, onClose }) {
  const channels = contact?.channels || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pr-10">
          <span className="text-xs font-medium tracking-wide text-primary uppercase">
            Contato direto
          </span>
          <DialogTitle>{contact?.title || "Contato BP/NSEE"}</DialogTitle>
          {contact?.description ? (
            <DialogDescription>{contact.description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {channels.length ? (
          <ItemGroup className="gap-2">
            {channels.map((channel) => {
              const Icon = CHANNEL_ICONS[channel.type] || MessageCircle;
              return (
                <Item key={`${channel.label}-${channel.value}`} variant="outline">
                  <ItemMedia variant="icon">
                    <Icon aria-hidden="true" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{channel.label}</ItemTitle>
                    <span className="text-sm text-muted-foreground">{channel.value}</span>
                  </ItemContent>
                </Item>
              );
            })}
          </ItemGroup>
        ) : (
          <Alert variant="info">
            <AlertDescription>Canal oficial pendente de configuração.</AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
