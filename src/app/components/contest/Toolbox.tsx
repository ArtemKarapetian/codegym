import { BookOpen, MessageCircle, Bell, Trophy } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';

interface ToolboxProps {
  onRulesClick?: () => void;
  onContactClick?: () => void;
  onAnnouncementsClick?: () => void;
  onLeaderboardClick?: () => void;
  isMobile?: boolean;
}

export function Toolbox({
  onRulesClick,
  onContactClick,
  onAnnouncementsClick,
  onLeaderboardClick,
  isMobile = false,
}: ToolboxProps) {
  const tools = [
    { icon: BookOpen, label: 'Правила', onClick: onRulesClick },
    { icon: MessageCircle, label: 'Связь', onClick: onContactClick },
    { icon: Bell, label: 'Объявления', onClick: onAnnouncementsClick },
    { icon: Trophy, label: 'Лидерборд', onClick: onLeaderboardClick },
  ];

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--tinkoff-border)] z-40">
        <div className="flex items-center justify-around px-2 py-2">
          {tools.map((tool, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={tool.onClick}
              className="flex flex-col items-center gap-1 h-auto py-2 px-2"
            >
              <tool.icon className="w-5 h-5" />
              <span className="text-xs">{tool.label}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="fixed left-4 lg:left-8 top-1/2 -translate-y-1/2 z-40">
        <div className="bg-white border border-[var(--tinkoff-border)] rounded-2xl shadow-lg p-2 flex flex-col gap-2">
          {tools.map((tool, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={tool.onClick}
                  className="w-12 h-12 hover:bg-[var(--tinkoff-yellow)]/20"
                >
                  <tool.icon className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{tool.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
