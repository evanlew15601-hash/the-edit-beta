import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameState } from '@/types/game';

interface MemoryPanelProps {
  gameState: GameState;
}

export const MemoryPanel = ({ gameState }: MemoryPanelProps) => {
  const player = gameState.playerName;

  // Collect player-present memories from contestants' memories
  const mems = gameState.contestants
    .flatMap(c => c.memory.map(m => ({ ...m, owner: c.name })))
    .filter(m => m.participants?.includes(player));

  // Collect interaction log entries
  const logs = (gameState.interactionLog || []).filter(l => l.participants?.includes(player));

  // Normalize into a unified feed
  type FeedItem = { day: number; kind: string; text: string };
  const feed: FeedItem[] = [];

  mems.forEach(m => {
    const others = m.participants.filter(p => p !== player).join(', ');
    const label = m.type === 'conversation' ? 'Conversation'
      : m.type === 'dm' ? 'DM'
      : m.type === 'scheme' ? 'Scheme'
      : m.type === 'observation' ? 'Observation'
      : m.type === 'event' ? 'Event'
      : 'Memory';
    feed.push({ day: m.day, kind: label, text: others ? `${label} with ${others}: ${m.content}` : `${label}: ${m.content}` });
  });

  logs.forEach(l => {
    const others = (l.participants || []).filter(p => p !== player).join(', ');
    const label = l.type === 'talk' ? 'Conversation'
      : l.type === 'dm' ? 'DM'
      : l.type === 'scheme' ? 'Scheme'
      : l.type === 'activity' ? 'Activity'
      : 'Log';
    const txt = l.content || (l.ai_response ? `AI: ${l.ai_response}` : '');
    feed.push({ day: l.day, kind: label, text: others ? `${label} with ${others}: ${txt}` : `${label}: ${txt}` });
  });

  feed.sort((a, b) => a.day - b.day);

  return (
    <Card className="p-4">
      <h3 className="text-lg font-light mb-3">Your Memory Log</h3>
      <ScrollArea className="h-80 pr-3">
        <div className="space-y-2">
          {feed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No memories yet. Your actions and nearby events will appear here.</p>
          ) : (
            feed.map((f, idx) => (
              <div key={idx} className="text-sm">
                <span className="text-muted-foreground mr-2">Day {f.day}</span>
                <span className="font-medium mr-2">{f.kind}</span>
                <span className="text-foreground">{f.text}</span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};