import { useState } from 'react';
import { MessageCircle, Send, Check } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toast } from 'sonner';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatUrl?: string | null;
}

export function ContactModal({ isOpen, onClose, chatUrl }: ContactModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSent(true);
    toast.success('Запрос отправлен организаторам');
    setTimeout(() => {
      setIsSent(false);
      setSubject('');
      setMessage('');
      onClose();
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Связь с организаторами</DialogTitle>
          <DialogDescription>Выберите удобный способ связи</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Telegram Button */}
          <div className="bg-[var(--tinkoff-gray)] rounded-xl p-6 text-center space-y-3">
            <MessageCircle className="w-12 h-12 mx-auto text-[var(--tinkoff-dark-gray)]" />
            <h3 className="font-semibold">Telegram</h3>
            <p className="text-sm text-gray-600">
              Самый быстрый способ связи с организаторами
            </p>
            <Button
              asChild
              className="w-full bg-[#0088cc] hover:bg-[#0088cc]/90 text-white"
            >
              <a
                href="https://t.me/kod_sporta"
                target="_blank"
                rel="noopener noreferrer"
              >
                Написать в Telegram
              </a>
            </Button>
            <p className="text-xs text-gray-500">@kod_sporta</p>
            {chatUrl && (
              <Button asChild variant="outline" className="w-full mt-2">
                <a href={chatUrl} target="_blank" rel="noopener noreferrer">
                  Чат города
                </a>
              </Button>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--tinkoff-border)]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">или</span>
            </div>
          </div>

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Тема обращения
              </label>
              <Select value={subject} onValueChange={setSubject} required>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тему" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">
                    Техническая проблема
                  </SelectItem>
                  <SelectItem value="task">Вопрос по задаче</SelectItem>
                  <SelectItem value="rules">Вопрос по правилам</SelectItem>
                  <SelectItem value="other">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Сообщение
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Опишите вашу проблему или вопрос..."
                rows={4}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[var(--tinkoff-yellow)] hover:bg-[var(--tinkoff-yellow)]/90 text-black"
              disabled={isSent}
            >
              {isSent ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Отправлено
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Отправить запрос
                </>
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
