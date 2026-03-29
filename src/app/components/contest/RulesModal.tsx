import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Правила контеста Code Gym × T-Bank
          </DialogTitle>
          <DialogDescription>
            Внимательно ознакомьтесь с правилами перед началом
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* TL;DR */}
          <div className="bg-[var(--tinkoff-yellow)]/20 border-l-4 border-[var(--tinkoff-yellow)] p-4 rounded-r-lg">
            <h3 className="font-semibold mb-2">TL;DR</h3>
            <ul className="space-y-1 text-sm">
              <li>• Решайте задачи и выполняйте физические упражнения</li>
              <li>• 10 основных зон + дополнительные задания</li>
              <li>• Отправка решений через eJudge</li>
              <li>• При вопросах пишите организаторам в Telegram</li>
            </ul>
          </div>

          {/* Rules sections */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Формат контеста</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Code Gym — это уникальный формат офлайн-контеста, где
                программирование сочетается с физической активностью. Каждая
                зона представляет собой связку "Задача ↔ Упражнение".
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. Система оценки</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Баллы начисляются за правильно решённые задачи. Учитывается
                время решения и количество попыток. Штрафное время добавляется
                за каждую неудачную попытку.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Отправка решений</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Все решения отправляются через систему eJudge. Нажмите на зону
                задачи на карте, затем используйте кнопку "Открыть задачу в
                eJudge" для перехода к форме отправки.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. Дополнительные зоны</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                На карте есть зоны для отдыха (вода, питание), фотозона и
                сайд-квесты с бонусными заданиями. Используйте их для
                восстановления сил между решением задач.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">5. Командная работа</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Вы можете работать в команде. Обсуждайте стратегию,
                распределяйте задачи и поддерживайте друг друга в выполнении
                упражнений.
              </p>
            </div>
          </div>

          {/* Contact info */}
          <div className="border-t border-[var(--tinkoff-border)] pt-4">
            <p className="text-sm text-gray-600">
              <strong>Спорная ситуация?</strong> Свяжитесь с организаторами в
              Telegram:{' '}
              <a
                href="https://t.me/codegym24"
                className="text-blue-600 hover:underline"
              >
                @codegym24
              </a>
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--tinkoff-border)]">
          <Button
            className="bg-[var(--tinkoff-yellow)] hover:bg-[var(--tinkoff-yellow)]/90 text-black"
            onClick={onClose}
          >
            Понятно
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
