import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActionPanel } from './ActionPanel';
import { ContestantGrid } from './ContestantGrid';
import { AmbientNPCActivity } from './AmbientNPCActivity';
import { AllianceIntelligencePanel } from './AllianceIntelligencePanel';
import { VotingIntelligencePanel } from './VotingIntelligencePanel';
import { MemoryPanel } from './MemoryPanel';
import { EnhancedInformationPanel } from './EnhancedInformationPanel';
import { RatingsPanel } from './RatingsPanel';
import { ProductionTasksPanel } from './ProductionTasksPanel';
import { useGame } from '@/contexts/GameContext';

const tabs = [
  { id: 'play', label: 'Play' },
  { id: 'house', label: 'House' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'edit', label: 'Edit' },
] as const;

export const HouseDesk = () => {
  const { gameState } = useGame();
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('play');

  return (
    <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
      <TabsList className="grid w-full grid-cols-4">
        {tabs.map(item => (
          <TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="play" className="mt-4">
        <ActionPanel />
      </TabsContent>

      <TabsContent value="house" className="mt-4 space-y-4">
        <AmbientNPCActivity />
        <ContestantGrid />
      </TabsContent>

      <TabsContent value="strategy" className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Who votes together, who flipped, and what you actually know. Ask before you pitch.
        </p>
        {(gameState.alliances || []).length > 0 && <AllianceIntelligencePanel />}
        <VotingIntelligencePanel />
        <MemoryPanel />
        <EnhancedInformationPanel />
      </TabsContent>

      <TabsContent value="edit" className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Ratings are the audience. Production tasks are the other game. Confessionals live under Play.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <RatingsPanel />
          <ProductionTasksPanel />
        </div>
      </TabsContent>
    </Tabs>
  );
};
