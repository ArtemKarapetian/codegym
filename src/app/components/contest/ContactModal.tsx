import { MessageCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatUrl?: string | null;
}

export function ContactModal({ isOpen, onClose, chatUrl }: ContactModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl">Связь с организаторами</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Button
            asChild
            className="w-full bg-[#0088cc] hover:bg-[#0088cc]/90 text-white gap-2"
          >
            <a
              href="https://t.me/kod_sporta"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="w-4 h-4" />
              Канал @kod_sporta
            </a>
          </Button>

          {chatUrl && (
            <Button asChild variant="outline" className="w-full gap-2">
              <a href={chatUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4" />
                Чат города
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
