import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { buildContestantMemoryRecap } from '@/utils/enhancedMemoryRecap';
import { GameState } from '@/types/game';
import { Crown, Trophy, Target, Heart, TrendingUp, Calendar, Users, Zap } from 'lucide-react';

interface PostSeasonRecapScreenProps {
  gameState: GameState;
  winner: string;
  finalVotes: { [juryMember: string]: string };
  onRestart: () => void;
}

export const PostSeasonRecapScreen = ({ gameState, winner, finalVotes, onRestart }: PostSeasonRecapScreenProps) => {
  const [activeTab, setActiveTab] = useState('overview');

  const hasWinner =
    !!winner &&
    winner !== 'Unknown' &&
    !!gameState.contestants.find(c => c.name === winner);

  const missionWinnings = gameState.playerFunds ?? 0;

  // Guard: Validate winner exists when we expect one
  if (!hasWinner && winner && winner !== 'Unknown') {
    console.error('[PostSeasonRecap] Invalid winner:', winner);
  }

  const allContestants = gameState.contestants.sort((a, b) => {
    if (a.isEliminated !== b.isEliminated) {
      return a.isEliminated ? 1 : -1;
    }
    return (b.eliminationDay || gameState.currentDay) - (a.eliminationDay || gameState.currentDay);
  });

  const playerStats = calculatePlayerStats(gameState);
  const seasonHighlights = generateSeasonHighlights(gameState);
  const awards = calculateSeasonAwards(gameState);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Winner / Recap Announcement */}
        <Card className="p-8 text-center bg-primary/10 border-primary/20">
          <Crown className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-light mb-2">
            {hasWinner ? 'Season Complete' : 'Season Recap'}
          </h1>
          {hasWinner ? (
            <>
              <h2 className="text-2xl font-medium mb-4">
                {winner} is the Winner!
              </h2>
              <p className="text-muted-foreground">
                {winner === gameState.playerName 
                  ? 'Congratulations. You won the jury vote and walk out with the grand prize.'
                  : `${winner} outplayed, outwitted, and outlasted everyone to claim the grand prize.`
                }
              </p>
              {missionWinnings > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  You also banked ${missionWinnings.toLocaleString()} in secret production mission bonuses along the way.
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">
              Your game ended before a final winner was crowned in this save. Here’s how your story was edited this season.
            </p>
          )}
        </Card>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="jury">Jury Votes</TabsTrigger>
            <TabsTrigger value="final3">Final 3 Tie-Break</TabsTrigger>
            <TabsTrigger value="twists">Twists</TabsTrigger>
            <TabsTrigger value="awards">Awards</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Final Standings */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-medium">Final Standings</h3>
              </div>
              <div className="space-y-3">
                {allContestants.map((contestant, index) => (
                  <div 
                    key={contestant.id}
                    className={`flex items-center justify-between p-3 border rounded ${
                      contestant.name === gameState.playerName 
                        ? 'border-primary/20 bg-primary/10' 
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        index === 0 ? 'bg-primary text-primary-foreground' :
                        index === 1 ? 'bg-muted text-muted-foreground' :
                        'bg-muted/50 text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">
                          {contestant.name}
                          {contestant.name === gameState.playerName && ' (You)'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {contestant.publicPersona}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {contestant.isEliminated 
                          ? `Day ${contestant.eliminationDay}` 
                          : 'Winner'
                        }
                      </div>
                      {index === 0 && (
                        <Badge variant="default" className="mt-1">
                          <Crown className="w-3 h-3 mr-1" />
                          Winner
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Your Journey Summary */}
            <Card className="p-6">
              <h3 className="text-xl font-medium mb-4">Your Season Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border border-border rounded">
                  <div className="text-2xl font-bold text-primary">{playerStats.daysPlayed}</div>
                  <div className="text-sm text-muted-foreground">Days Played</div>
                </div>
                <div className="text-center p-4 border border-border rounded">
                  <div className="text-2xl font-bold text-primary">{playerStats.allianceCount}</div>
                  <div className="text-sm text-muted-foreground">Alliances Formed</div>
                </div>
                <div className="text-center p-4 border border-border rounded">
                  <div className="text-2xl font-bold text-primary">{playerStats.finalPlacement}</div>
                  <div className="text-sm text-muted-foreground">Final Placement</div>
                </div>
              </div>
            </Card>

            {/* Season Highlights */}
            <Card className="p-6">
              <h3 className="text-xl font-medium mb-4">Season Highlights</h3>
              <div className="space-y-3">
                {seasonHighlights.map((highlight, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border border-border rounded">
                    <Zap className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{highlight.title}</div>
                      <div className="text-sm text-muted-foreground">{highlight.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">Day {highlight.day}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Finalists Memory Recap Links */}
              <div className="mt-6">
                <h4 className="font-medium mb-3">Finalists Memory Recaps</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {gameState.contestants.filter(c => !c.isEliminated).map(finalist => {
                    const recap = buildContestantMemoryRecap(gameState, finalist.name);
                    return (
                      <Dialog key={finalist.id}>
                        <DialogTrigger asChild>
                          <Button variant="surveillance" className="justify-between">
                            <span>{finalist.name} — View Memory Recap</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{finalist.name} — Memory Recap</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            <div className="p-2 border border-border rounded text-sm">
                              {recap.summary}
                            </div>
                            {recap.topMoments.length > 0 ? (
                              recap.topMoments.map((m, idx) => (
                                <div key={idx} className="p-2 border border-border rounded">
                                  <div className="text-sm font-medium">Day {m.day} — {m.type}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {m.content}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Emotional impact: {m.emotionalImpact}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground">No significant moments recorded for this finalist.</div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    );
                  })}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-medium mb-4">Detailed Statistics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Player Stats */}
                <div>
                  <h4 className="font-medium mb-3">Your Performance</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Days Survived:</span>
                      <span>{playerStats.daysPlayed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confessionals Given:</span>
                      <span>{playerStats.confessionalCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Alliances Formed:</span>
                      <span>{playerStats.allianceCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Strategic Conversations:</span>
                      <span>{playerStats.conversationCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Schemes Executed:</span>
                      <span>{playerStats.schemeCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Final Edit Persona:</span>
                      <span>{gameState.editPerception.persona}</span>
                    </div>
                  </div>
                </div>

                {/* Season Stats */}
                <div>
                  <h4 className="font-medium mb-3">Season Overview</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Days:</span>
                      <span>{gameState.currentDay}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contestants:</span>
                      <span>{gameState.contestants.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Eliminations:</span>
                      <span>{gameState.votingHistory.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Jury Size:</span>
                      <span>{gameState.juryMembers?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Alliances Created:</span>
                      <span>{gameState.alliances.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Twists Activated:</span>
                      <span>{gameState.twistsActivated.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* All Contestant Stats */}
            <Card className="p-6">
              <h3 className="text-xl font-medium mb-4">All Contestants</h3>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {allContestants.map((contestant) => (
                    <div key={contestant.id} className="flex items-center justify-between p-2 border border-border rounded">
                      <div>
                        <div className="font-medium">
                          {contestant.name}
                          {contestant.name === gameState.playerName && ' (You)'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {contestant.publicPersona}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div>Day {contestant.eliminationDay || gameState.currentDay}</div>
                        <div className="text-muted-foreground">
                          {contestant.memory.length} memories
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="jury" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-medium">Jury Voting Breakdown</h3>
              </div>
              {Object.keys(finalVotes || {}).length === 0 ? (
                <div className="p-4 border border-border rounded text-sm text-muted-foreground">
                  Jury votes not available.
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(finalVotes).map(([juror, vote]) => (
                    <div key={juror} className={`p-2 border rounded ${juror === gameState.playerName ? 'border-primary/20 bg-primary/10' : 'border-border'}`}>
                      <div className="flex items-center justify-between">
                        <div className={`font-medium ${juror === gameState.playerName ? 'text-primary' : ''}`}>
                          {juror}{juror === gameState.playerName ? ' (You)' : ''}
                        </div>
                        <div className="text-sm">
                          {vote ? (
                            <>voted for <span className="font-medium">{vote}</span></>
                          ) : (
                            <span className="text-muted-foreground">{juror === gameState.playerName ? 'did not vote' : 'vote pending'}</span>
                          )}
                        </div>
                      </div>
                      {gameState.juryRationales?.[juror] && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {gameState.juryRationales[juror]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-medium">Season Timeline</h3>
              </div>
              
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {gameState.votingHistory.map((vote, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border border-border rounded">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          Day {vote.day}: {vote.eliminated} Eliminated
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {vote.reason}
                        </div>
                        {vote.tieBreak && (
                          <div className="text-xs text-primary mt-1">
                            Tie-break: {vote.tieBreak.method === 'revote' ? 'Revote' : 'Sudden Death'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Finale */}
                  {hasWinner && (
                    <div className="flex items-start gap-3 p-3 border border-primary/20 bg-primary/10 rounded">
                      <Crown className="w-5 h-5 text-primary mt-1" />
                      <div className="flex-1">
                        <div className="font-medium">
                          Day {gameState.currentDay}: {winner} Crowned Winner
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Won jury vote {Object.values(finalVotes).filter(v => v === winner).length}-{Object.values(finalVotes).filter(v => v !== winner).length}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Final 3 Tie-Break Recap */}
          <TabsContent value="final3" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-medium">Final 3 Tie-Break</h3>
              </div>

              {!gameState.final3TieBreak ? (
                <div className="p-4 border border-border rounded text-sm text-muted-foreground">
                  No 1-1-1 tie occurred during the Final 3.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 border border-border rounded">
                    <div className="font-medium">Method</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {gameState.final3TieBreak.method.replace('_', ' ')}
                    </div>
                  </div>

                  {gameState.final3TieBreak.selectionReason && (
                    <div className="p-4 border border-border rounded">
                      <div className="font-medium">How the route was chosen</div>
                      <div className="text-sm text-muted-foreground">
                        {gameState.final3TieBreak.selectionReason === 'player_persuasion' && 'Chosen via player persuasion (the group agreed to the player’s proposal).'}
                        {gameState.final3TieBreak.selectionReason === 'npc_choice' && 'NPCs selected the route after declining the player’s proposal.'}
                        {gameState.final3TieBreak.selectionReason === 'manual' && 'Route chosen directly without persuasion.'}
                      </div>
                    </div>
                  )}

                  <div className="p-4 border border-border rounded">
                    <div className="font-medium">Outcome</div>
                    <div className="text-sm text-muted-foreground">
                      Eliminated: <span className="font-medium">{gameState.final3TieBreak.eliminated}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Advanced to Final 2: <span className="font-medium">{gameState.final3TieBreak.winners.join(', ')}</span>
                    </div>
                  </div>

                  {(gameState.final3TieBreak.results && gameState.final3TieBreak.results.length > 0) && (
                    <Card className="p-4">
                      <h4 className="font-medium mb-2">Challenge Results</h4>
                      <div className="space-y-2">
                        {gameState.final3TieBreak.results
                          ?.sort((a, b) => a.time - b.time)
                          .map((res, idx) => (
                            <div key={res.name} className={`flex justify-between p-2 border rounded ${idx < 2 ? 'border-primary/20 bg-primary/10' : 'border-destructive/20 bg-destructive/10'}`}>
                              <span className={res.name === gameState.playerName ? 'text-primary font-medium' : 'font-medium'}>
                                {res.name}{res.name === gameState.playerName ? ' (You)' : ''}
                              </span>
                              <span className="text-sm">{Math.floor(res.time / 60)}:{Math.floor(res.time % 60).toString().padStart(2, '0')}</span>
                            </div>
                          ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Twists & Special Backgrounds */}
          <TabsContent value="twists" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-medium">Twists & Special Backgrounds</h3>
              </div>

              {/* Host's Estranged Child */}
              {gameState.hostChildName ? (
                <div className="p-4 border border-border rounded mb-4">
                  <div className="font-medium">Host’s Estranged Child</div>
                  <div className="text-sm text-muted-foreground">
                    {gameState.hostChildName}{gameState.hostChildName === gameState.playerName ? ' (You)' : ''} had their secret revealed
                    {typeof gameState.hostChildRevealDay === 'number' ? ` on Day ${gameState.hostChildRevealDay}` : ''}.
                  </div>
                </div>
              ) : (
                <div className="p-4 border border-border rounded mb-4 text-sm text-muted-foreground">
                  No host-family twist revealed this season.
                </div>
              )}

              {/* Planted Houseguest(s) */}
              {gameState.contestants.some(c => c.special?.kind === 'planted_houseguest') ? (
                <div className="space-y-3">
                  {gameState.contestants
                    .filter(c => c.special?.kind === 'planted_houseguest')
                    .map(c => {
                      const spec = c.special as any;
                      const tasks = spec.tasks || [];
                      const completedCount = tasks.filter((t: any) => t.completed).length;
                      const totalMissions = tasks.length;
                      const missedCount = totalMissions - completedCount;

                      return (
                        <div key={c.id} className="p-4 border border-border rounded">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">
                              Planted Houseguest: {c.name}{c.name === gameState.playerName ? ' (You)' : ''}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {spec.secretRevealed
                                ? `Secret revealed${spec.revealDay ? ` on Day ${spec.revealDay}` : ''}`
                                : 'Secret remained hidden'}
                            </div>
                          </div>
                          <div className="mt-2 space-y-1">
                            {tasks.map((t: any) => (
                              <div key={t.id} className="flex items-center justify-between text-sm">
                                <div>
                                  <span className="font-medium">{t.description}</span>
                                  <span className="text-muted-foreground text-xs"> — Assigned Day {t.dayAssigned}</span>
                                </div>
                                <Badge variant={t.completed ? 'secondary' : 'outline'} className="text-[10px]">
                                  {t.completed ? 'Completed' : 'Pending'}
                                </Badge>
                              </div>
                            ))}
                            {totalMissions > 0 && (
                              <div className="text-[11px] text-muted-foreground pt-1">
                                Missions completed: {completedCount} of {totalMissions}
                                {missedCount > 0 ? ` (missed ${missedCount})` : ''}.
                              </div>
                            )}
                            {c.name === gameState.playerName && typeof gameState.playerFunds === 'number' && (
                              <div className="text-[11px] text-muted-foreground pt-1">
                                Total mission bonuses earned: ${gameState.playerFunds.toLocaleString()}.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="p-4 border border-border rounded text-sm text-muted-foreground">
                  No planted houseguest twist this season.
                </div>
              )}

              {/* Twist Narrative Recap */}
              {gameState.twistNarrative && gameState.twistNarrative.arc !== 'none' && (
                <div className="mt-6 p-4 border border-primary/20 bg-primary/10 rounded">
                  <div className="font-medium mb-2">Narrative Arc</div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Arc: {gameState.twistNarrative.arc === 'hosts_child' ? 'Host’s Child' : 'Planted Houseguest'}
                  </div>
                  <div className="space-y-1">
                    {gameState.twistNarrative.beats.map((b) => (
                      <div key={b.id} className="flex items-center justify-between text-sm">
                        <span>{b.title}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={b.status === 'completed' ? 'secondary' : 'outline'} className="text-[10px]">
                            {b.status}
                          </Badge>
                          {b.summary && (
                            <span className="text-[10px] text-muted-foreground">{b.summary}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="awards" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-medium">Season Awards</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {awards.map((award, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <award.icon className="w-5 h-5 text-primary" />
                      <h4 className="font-medium">{award.title}</h4>
                    </div>
                    <div className="text-lg font-medium">{award.winner}</div>
                    <div className="text-sm text-muted-foreground">{award.reason}</div>
                  </Card>
                ))}
              </div>
            </Card>

            {/* America's Favorite Player */}
            {gameState.afpRanking && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-medium">America's Favorite Player Results</h3>
                </div>
                
                <div className="space-y-2">
                  {gameState.afpRanking
                    .slice(0, 5)
                    .map((contestant, index) => (
                      <div key={contestant.name} className="flex items-center justify-between p-2 border border-border rounded">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          <span className={contestant.name === gameState.playerName ? 'text-primary font-medium' : ''}>
                            {contestant.name}
                            {contestant.name === gameState.playerName && ' (You)'}
                          </span>
                          {index === 0 && (
                            <Badge variant="default" className="ml-2">
                              <Heart className="w-3 h-3 mr-1" />
                              AFP Winner
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm font-medium">
                          {Math.round(contestant.score)} points
                        </div>
                      </div>
                    ))}
                </div>
                
                {gameState.afpVote && (
                  <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded">
                    <p className="text-sm">
                      <strong>Your Vote:</strong> You voted for {gameState.afpVote} as America's Favorite Player.
                    </p>
                  </div>
                )}

                {gameState.favoriteTally && Object.keys(gameState.favoriteTally).length > 0 && (
                  <div className="mt-4 p-3 bg-muted/50 border border-border rounded">
                    <p className="text-xs text-muted-foreground">
                      Weekly audience signals influenced AFP scoring based on favoriteTally.
                    </p>
                  </div>
                )}
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Restart Button */}
        <div className="text-center pt-6">
          <Button variant="action" onClick={onRestart} size="wide">
            Start New Season
          </Button>
        </div>
      </div>
    </div>
  );
};

function calculatePlayerStats(gameState: GameState) {
  const player = gameState.contestants.find(c => c.name === gameState.playerName);
  
  // SAFE: Calculate stats even if player doesn't exist
  if (!player) {
    console.warn('Player not found in contestants - using fallback stats');
    return {
      daysPlayed: gameState.currentDay,
      confessionalCount: gameState.confessionals?.length || 0,
      allianceCount: gameState.alliances?.filter(a => a.members.includes(gameState.playerName)).length || 0,
      conversationCount: 0,
      schemeCount: 0,
      finalPlacement: gameState.contestants.length + 1 // Assume last place if not found
    };
  }
  
  return {
    daysPlayed: player.eliminationDay || gameState.currentDay,
    confessionalCount: gameState.confessionals?.length || 0,
    allianceCount: gameState.alliances?.filter(a => a.members.includes(gameState.playerName)).length || 0,
    conversationCount: gameState.interactionLog?.filter(log => 
      log.type === 'talk' && log.participants.includes(gameState.playerName)
    ).length || 0,
    schemeCount: gameState.interactionLog?.filter(log => 
      log.type === 'scheme' && log.participants.includes(gameState.playerName)
    ).length || 0,
    finalPlacement: gameState.contestants.filter(c => 
      !c.isEliminated || (c.eliminationDay || 0) >= (player.eliminationDay || 0)
    ).length
  };
}

function generateSeasonHighlights(gameState: GameState) {
  const highlights = [];
  
  // Major alliances
  gameState.alliances.forEach(alliance => {
    if (alliance.members.includes(gameState.playerName)) {
      highlights.push({
        title: 'Alliance Formed',
        description: `Formed alliance with ${alliance.members.filter(m => m !== gameState.playerName).join(', ')}`,
        day: alliance.formed
      });
    }
  });
  
  // Eliminations involving player votes
  gameState.votingHistory.forEach(vote => {
    if (vote.playerVote) {
      highlights.push({
        title: 'Elimination Vote',
        description: `Voted to eliminate ${vote.eliminated}`,
        day: vote.day
      });
    }
  });
  
  // High-impact interactions
  gameState.interactionLog?.forEach(log => {
    if (log.participants.includes(gameState.playerName) && log.type === 'scheme') {
      highlights.push({
        title: 'Strategic Move',
        description: `Executed scheme involving ${log.participants.filter(p => p !== gameState.playerName).join(', ')}`,
        day: log.day
      });
    }
  });
  
  return highlights
    .sort((a, b) => a.day - b.day)
    .slice(0, 8); // Show top 8 moments
}

function calculateSeasonAwards(gameState: GameState) {
  const awards = [];
  
  // Most Alliances
  const allianceCounts = gameState.contestants.map(c => ({
    name: c.name,
    count: gameState.alliances.filter(a => a.members.includes(c.name)).length
  }));
  const mostAlliances = allianceCounts.reduce((prev, current) => 
    current.count > prev.count ? current : prev
  );
  
  awards.push({
    title: 'Most Connected',
    winner: mostAlliances.name,
    reason: `Member of ${mostAlliances.count} alliances`,
    icon: Users
  });
  
  // Longest Survivor (if not winner)
  const winner = gameState.contestants.find(c => !c.isEliminated);
  const longestSurvivor = gameState.contestants
    .filter(c => c.isEliminated && c.name !== winner?.name)
    .reduce((prev, current) => 
      (current.eliminationDay || 0) > (prev.eliminationDay || 0) ? current : prev
    );
  
  if (longestSurvivor) {
    awards.push({
      title: 'Fan Favorite',
      winner: longestSurvivor.name,
      reason: `Survived until Day ${longestSurvivor.eliminationDay}`,
      icon: Heart
    });
  }
  
  // Most Strategic (based on schemes)
  const schemeCounts = gameState.contestants.map(c => ({
    name: c.name,
    count: gameState.interactionLog?.filter(log => 
      log.type === 'scheme' && log.participants.includes(c.name)
    ).length || 0
  }));
  const mostStrategic = schemeCounts.reduce((prev, current) => 
    current.count > prev.count ? current : prev
  );
  
  if (mostStrategic.count > 0) {
    awards.push({
      title: 'Master Strategist',
      winner: mostStrategic.name,
      reason: `Executed ${mostStrategic.count} strategic moves`,
      icon: Target
    });
  }
  
  // Highest Trust Level
  const trustLevels = gameState.contestants.map(c => ({
    name: c.name,
    trust: c.psychProfile.trustLevel
  }));
  const mostTrusted = trustLevels.reduce((prev, current) => 
    current.trust > prev.trust ? current : prev
  );
  
  awards.push({
    title: 'Most Trustworthy',
    winner: mostTrusted.name,
    reason: `Trust level: ${mostTrusted.trust}`,
    icon: Heart
  });
  
  return awards;
}