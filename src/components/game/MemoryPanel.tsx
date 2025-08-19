import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { GameState } from '@/types/game';
import { memoryEngine } from '@/utils/memoryEngine';

interface MemoryPanelProps {
  gameState: GameState;
}

export const MemoryPanel = ({ gameState }: MemoryPanelProps) => {
  const player = gameState.playerName;

  // Get strategic context from memory engine
  const strategicContext = memoryEngine.getStrategicContext(player, gameState);

  // Collect player-present memories from contestants' memories
  const mems = gameState.contestants
    .flatMap(c => c.memory?.map(m => ({ ...m, owner: c.name })) || [])
    .filter(m => m.participants?.includes(player))
    .filter(m => m.day >= gameState.currentDay - 7); // Only show recent events

  // Collect interaction log entries (recent only)
  const logs = (gameState.interactionLog || [])
    .filter(l => l.participants?.includes(player))
    .filter(l => l.day >= gameState.currentDay - 7);

  // Normalize into a unified feed
  type FeedItem = { day: number; kind: string; text: string; importance?: number };
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
      <h3 className="text-lg font-light mb-3">Strategic Memory</h3>
      
      {/* Strategic Overview */}
      {strategicContext && (
        <div className="mb-4 p-3 bg-muted border border-border rounded">
          <div className="space-y-2">
            <div>
              <span className="text-xs text-muted-foreground">Current Strategy:</span>
              <p className="text-sm font-medium">{strategicContext.currentStrategy}</p>
            </div>
            
            {strategicContext.topThreats.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Top Threats:</span>
                <div className="flex gap-1 mt-1">
                  {strategicContext.topThreats.map(threat => (
                    <Badge key={threat} variant="destructive" className="text-xs">{threat}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {strategicContext.allies.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Closest Allies:</span>
                <div className="flex gap-1 mt-1">
                  {strategicContext.allies.map(ally => (
                    <Badge key={ally} variant="secondary" className="text-xs">{ally}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ScrollArea className="h-60 pr-3">
        <div className="space-y-2">
          {feed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No memories yet. Your actions and nearby events will appear here.</p>
          ) : (
            feed
              .sort((a, b) => b.day - a.day) // Most recent first
              .slice(0, 20) // Show last 20 events
              .map((f, idx) => (
                <div key={idx} className="text-sm border-l-2 border-muted pl-3 py-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-muted-foreground text-xs">Day {f.day}</span>
                    <Badge variant="outline" className="text-xs">{f.kind}</Badge>
                    {f.importance && f.importance > 7 && (
                      <Badge variant="destructive" className="text-xs">Important</Badge>
                    )}
                  </div>
                  <span className="text-foreground text-sm">{f.text}</span>
                </div>
              ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};