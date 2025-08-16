import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alliance, Contestant, GameState } from '@/types/game';
import { Users, MessageSquare, Target, AlertTriangle } from 'lucide-react';

interface AllianceMeetingScreenProps {
  gameState: GameState;
  onSubmitMeeting: (allianceId: string, agenda: string, tone: string) => void;
  onBack: () => void;
}

export const AllianceMeetingScreen: React.FC<AllianceMeetingScreenProps> = ({
  gameState,
  onSubmitMeeting,
  onBack
}) => {
  const [selectedAlliance, setSelectedAlliance] = useState<string>('');
  const [agenda, setAgenda] = useState<string>('');
  const [tone, setTone] = useState<string>('');

  const playerAlliances = gameState.alliances.filter(a => 
    a.members.includes(gameState.playerName)
  );

  const toneOptions = [
    { value: 'strategic', label: 'Strategic', description: 'Focus on game moves and voting plans' },
    { value: 'reassuring', label: 'Reassuring', description: 'Build trust and calm nerves' },
    { value: 'warning', label: 'Warning', description: 'Alert about threats and dangers' },
    { value: 'conspiratorial', label: 'Conspiratorial', description: 'Share secrets and plot moves' }
  ];

  const handleSubmit = () => {
    if (selectedAlliance && agenda.trim() && tone) {
      onSubmitMeeting(selectedAlliance, agenda.trim(), tone);
    }
  };

  const isReadyToSubmit = selectedAlliance && agenda.trim().length > 10 && tone;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alliance Meeting</h1>
          <p className="text-muted-foreground">Call a private meeting with your alliance members</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back to Game
        </Button>
      </div>

      {playerAlliances.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Active Alliances</h3>
            <p className="text-muted-foreground">
              You need to form alliances before you can call meetings. Try talking to other contestants first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alliance Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Alliance
              </CardTitle>
              <CardDescription>Choose which alliance to meet with</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {playerAlliances.map(alliance => (
                <div
                  key={alliance.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedAlliance === alliance.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedAlliance(alliance.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">
                      {alliance.members.filter(m => m !== gameState.playerName).join(', ')}
                    </h4>
                    <Badge variant={alliance.secret ? 'secondary' : 'outline'}>
                      {alliance.secret ? 'Secret' : 'Open'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Strength: {alliance.strength}/100</span>
                    <span>Formed Day {alliance.formed}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Meeting Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Meeting Setup
              </CardTitle>
              <CardDescription>Set the agenda and tone for your meeting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Meeting Agenda</label>
                <Textarea
                  placeholder="What do you want to discuss? (voting plans, threats, strategy...)"
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Meeting Tone</label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your approach..." />
                  </SelectTrigger>
                  <SelectContent>
                    {toneOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleSubmit} 
                disabled={!isReadyToSubmit}
                className="w-full"
              >
                <Target className="h-4 w-4 mr-2" />
                Call Alliance Meeting
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};