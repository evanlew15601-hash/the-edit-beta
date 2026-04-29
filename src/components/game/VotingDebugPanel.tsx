import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { useGame } from '@/contexts/GameContext';
import { relationshipGraphEngine } from '@/utils/relationshipGraphEngine';
import { memoryEngine } from '@/utils/memoryEngine';
import { clearLocalInteractions, fetchLatestInteractions } from '@/utils/interactionLogger';

export const VotingDebugPanel: React.FC = () => {
  const {
    gameState,
    advanceDay,
    proceedToJuryVote,
    proceedToFinaleAsJuror,
    proceedToJuryVoteAsJuror,
    setupFinal3,
    setupFinal3TieBreak,
    continueFromElimination,
    toggleDebugMode,
    submitPlayerVote,
    submitFinal3Vote,
    continueFromFinal3Results,
    handleTieBreakResult,
    endGame,
  } = useGame();

  const [exporting, setExporting] = React.useState(false);
  const [clearingLogs, setClearingLogs] = React.useState(false);

  const downloadJson = (filename: string, data: unknown) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportDiagnostics = async () => {
    setExporting(true);
    try {
      const interactions = await fetchLatestInteractions({ limit: 400 });
      const payload = {
        exportedAt: new Date().toISOString(),
        build: {
          mode: import.meta.env.MODE,
          betaDebug: import.meta.env.VITE_ENABLE_BETA_DEBUG,
        },
        gameState,
        interactions,
      };

      const safePlayer = (gameState.playerName || 'player').replace(/[^a-z0-9_-]+/gi, '_');
      downloadJson(`rtv_diagnostics_${safePlayer}_day${gameState.currentDay}.json`, payload);
    } finally {
      setExporting(false);
    }
  };

  const clearDiagnosticsLogs = async () => {
    setClearingLogs(true);
    try {
      await clearLocalInteractions();
    } finally {
      setClearingLogs(false);
    }
  };

  if (!gameState.debugMode) return null;

  const active = gameState.contestants.filter(c => !c.isEliminated);
  const eliminated = gameState.contestants.filter(c => c.isEliminated);
  const nonPlayerActive = active.filter(c => c.name !== gameState.playerName);
  const nonPlayerEligibleForVote = nonPlayerActive.filter(c => c.name !== gameState.immunityWinner);

  const lastVote = gameState.votingHistory[gameState.votingHistory.length - 1];
  const lastDebug = lastVote?.debug;

  const relationshipSnapshot = React.useMemo(
    () =>
      active
        .map((c) => {
          const standing = relationshipGraphEngine.calculateSocialStanding(c.name);
          return { name: c.name, ...standing };
        })
        .sort((a, b) => b.socialPower - a.socialPower)
        .slice(0, 6),
    [active]
  );

  const allianceSummary = React.useMemo(
    () =>
      gameState.alliances.map((a) => ({
        id: a.id,
        name: a.name,
        strength: a.strength,
        members: a.members.length,
        secret: a.secret,
        exposureRisk: typeof a.exposureRisk === 'number' ? a.exposureRisk : undefined,
      })),
    [gameState.alliances]
  );

  const votingPlans = React.useMemo(() => {
    return active
      .map((c) => {
        const plan = memoryEngine.getVotingPlan(c.name, gameState.currentDay);
        if (!plan || !plan.target) return null;
        return {
          name: c.name,
          target: plan.target,
          reasoning: plan.reasoning,
          source: plan.source,
          day: plan.day,
        };
      })
      .filter(Boolean) as {
        name: string;
        target: string;
        reasoning?: string;
        source?: string;
        day?: number;
      }[];
  }, [active, gameState.currentDay]);

  const player = React.useMemo(
    () => gameState.contestants.find(c => c.name === gameState.playerName),
    [gameState.contestants, gameState.playerName]
  );

  const planted = player?.special && player.special.kind === 'planted_houseguest' ? player.special : undefined;

  const plantedWeekTasks = React.useMemo(() => {
    if (!planted) return [];
    const week = Math.max(1, Math.floor((gameState.currentDay - 1) / 7) + 1);
    return (planted.tasks || []).filter(t => (t.week ?? week) === week);
  }, [planted, gameState.currentDay]);

  const confessionalStats = React.useMemo(() => {
    const confs = gameState.confessionals || [];
    const day = gameState.currentDay;
    const week = Math.max(1, Math.floor((day - 1) / 7) + 1);
    const start = (week - 1) * 7 + 1;
    const end = week * 7;

    const total = confs.length;
    const today = confs.filter(c => c.day === day).length;
    const thisWeek = confs.filter(c => c.day >= start && c.day <= end).length;
    const selectedTotal = confs.filter((c: any) => !!c.selected).length;
    const selectedWeek = confs.filter((c: any) => !!c.selected && c.day >= start && c.day <= end).length;

    return { week, start, end, total, today, thisWeek, selectedTotal, selectedWeek };
  }, [gameState.confessionals, gameState.currentDay]);

  const integrityWarnings = React.useMemo(() => {
    const warnings: string[] = [];

    if (gameState.twistNarrative?.beats) {
      const activeBeats = gameState.twistNarrative.beats.filter(b => b.status === 'active');
      if (activeBeats.length > 1) {
        warnings.push(`Multiple active beats: ${activeBeats.map(b => b.id).join(', ')}`);
      }
    }

    if (planted) {
      const tasks = planted.tasks || [];
      if (tasks.length === 0) warnings.push('Planted HG: no tasks found');
      if (tasks.length > 0 && plantedWeekTasks.length === 0) {
        warnings.push(`Planted HG: no tasks for week ${confessionalStats.week}`);
      }

      const unrewarded = tasks.filter(t => t.completed && !t.rewarded);
      if (unrewarded.length > 0) {
        warnings.push(`Planted HG: completed but not rewarded: ${unrewarded.map(t => t.id).join(', ')}`);
      }
    }

    return warnings;
  }, [gameState.twistNarrative, planted, plantedWeekTasks.length, confessionalStats.week]);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(340px,calc(100vw-2rem))] max-h-[80vh] overflow-y-auto pointer-events-none">
      <Card className="p-4 shadow-xl border border-border bg-card/95 backdrop-blur-md rounded-lg pointer-events-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[11px] text-muted-foreground">Developer Tools</div>
            <div className="text-xs text-muted-foreground">Phase</div>
            <div className="text-sm font-medium">{gameState.gamePhase}</div>
          </div>
          <Button variant="surveillance" size="sm" onClick={toggleDebugMode} aria-label="Toggle Debug HUD">
            {gameState.debugMode ? 'Hide Debug' : 'Show Debug'}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
          <div className="p-2 border rounded">
            <div className="text-muted-foreground">Day</div>
            <div className="font-medium">{gameState.currentDay}</div>
          </div>
          <div className="p-2 border rounded">
            <div className="text-muted-foreground">Next Elim Day</div>
            <div className="font-medium">{gameState.nextEliminationDay}</div>
          </div>
          <div className="p-2 border rounded">
            <div className="text-muted-foreground">Active</div>
            <div className="font-medium">{active.length}</div>
          </div>
          <div className="p-2 border rounded">
            <div className="text-muted-foreground">Eliminated</div>
            <div className="font-medium">{eliminated.length}</div>
          </div>
          <div className="p-2 border rounded col-span-2">
            <div className="text-muted-foreground">Immunity</div>
            <div className="font-medium">{gameState.immunityWinner || 'None'}</div>
          </div>
          <div className="p-2 border rounded col-span-2">
            <div className="text-muted-foreground">Jury Members</div>
            <div className="font-medium">
              {(gameState.juryMembers || []).join(', ') || 'None'}
            </div>
          </div>
        </div>

        <div className="p-2 border rounded text-xs mb-3 space-y-1">
          <div className="text-muted-foreground">Twists</div>
          <div className="font-medium">Arc: {gameState.twistNarrative?.arc || 'none'}</div>
          {gameState.twistNarrative?.currentBeatId && (
            <div>
              Active beat: <span className="font-medium">{gameState.twistNarrative.currentBeatId}</span>
            </div>
          )}
          {typeof gameState.playerCannotBeEliminatedUntilDay === 'number' && (
            <div className="text-destructive">
              Protection: player cannot be eliminated until Day {gameState.playerCannotBeEliminatedUntilDay}
            </div>
          )}
          {typeof gameState.hostChildFalloutUntilDay === 'number' && (
            <div>
              Host child fallout until Day {gameState.hostChildFalloutUntilDay}
            </div>
          )}
          {gameState.productionIntel && gameState.productionIntel.day === gameState.currentDay && (
            <div>
              Intel leaks: {gameState.productionIntel.leaks.map(l => `${l.npc} → ${l.target}`).join(' • ')}
            </div>
          )}
          {gameState.missionBroadcastBanner && gameState.missionBroadcastBanner.day === gameState.currentDay && (
            <div>
              Mission banner: <span className={gameState.missionBroadcastBanner.result === 'success' ? 'text-primary' : 'text-destructive'}>
                {gameState.missionBroadcastBanner.result}
              </span>
            </div>
          )}

          {plantedWeekTasks.length > 0 && (
            <div className="pt-1">
              <div className="text-muted-foreground">Planted HG • Week {confessionalStats.week}</div>
              {plantedWeekTasks.slice(0, 2).map(t => (
                <div key={t.id} className="flex justify-between">
                  <span className="truncate mr-2">{t.id}</span>
                  <span>
                    {t.progress ?? 0}/{t.target ?? 0}{t.completed ? ' ✓' : ''}
                  </span>
                </div>
              ))}
              {plantedWeekTasks.length > 2 && (
                <div className="text-muted-foreground">…{plantedWeekTasks.length - 2} more</div>
              )}
              {typeof gameState.playerFunds === 'number' && (
                <div className="text-muted-foreground">Funds: ${gameState.playerFunds}</div>
              )}
            </div>
          )}

          <div className="pt-1">
            <div className="text-muted-foreground">Confessionals</div>
            <div>
              Today: <span className="font-medium">{confessionalStats.today}</span> • Week: <span className="font-medium">{confessionalStats.thisWeek}</span> • Total:{' '}
              <span className="font-medium">{confessionalStats.total}</span>
            </div>
            <div className="text-muted-foreground">
              Selected: {confessionalStats.selectedWeek}/{confessionalStats.thisWeek} (week) • {confessionalStats.selectedTotal}/{confessionalStats.total} (total)
            </div>
          </div>

          {integrityWarnings.length > 0 && (
            <div className="pt-1 space-y-1">
              <div className="text-muted-foreground">Integrity</div>
              {integrityWarnings.map((w) => (
                <div key={w} className="text-destructive">{w}</div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={exportDiagnostics}
            className="w-full"
            disabled={exporting}
          >
            {exporting ? 'Exporting…' : 'Export Diagnostics'}
          </Button>
          <Button
            variant="outline"
            onClick={clearDiagnosticsLogs}
            className="w-full"
            disabled={clearingLogs}
          >
            {clearingLogs ? 'Clearing…' : 'Clear Local Logs'}
          </Button>

          <Button variant="action" onClick={advanceDay} className="w-full">
            Advance Day
          </Button>
          <Button variant="action" onClick={proceedToJuryVote} className="w-full">
            Proceed to Jury Vote (Player Finalist)
          </Button>
          <Button variant="secondary" onClick={proceedToFinaleAsJuror} className="w-full">
            Proceed to Finale (Player as Juror)
          </Button>
          <Button variant="secondary" onClick={proceedToJuryVoteAsJuror} className="w-full">
            Direct to Jury Vote (Player as Juror)
          </Button>
          <Button variant="outline" onClick={setupFinal3} className="w-full">
            Go to Final 3 Vote (Test)
          </Button>
          <Button variant="outline" onClick={setupFinal3TieBreak} className="w-full">
            Skip to Final 3 Tie-Break
          </Button>
          <Button variant="surveillance" onClick={() => continueFromElimination()} className="w-full">
            Continue From Elimination
          </Button>
          <Button
            variant="critical"
            onClick={() => window.dispatchEvent(new Event('rtv:test:forceElimination'))}
            className="w-full"
          >
            Force Player Elimination (Test)
          </Button>
          <Button
            variant="outline"
            onClick={() => window.dispatchEvent(new Event('rtv:test:skipToJury'))}
            className="w-full"
          >
            Skip to Jury (Test)
          </Button>

          {/* Phase-specific quick actions */}
          {gameState.gamePhase === 'player_vote' && (
            <div className="mt-2 border-t border-border pt-2">
              <div className="text-xs text-muted-foreground mb-1">Quick Player Vote</div>
              {nonPlayerEligibleForVote.map(c => (
                <Button
                  key={c.name}
                  variant="outline"
                  size="sm"
                  onClick={() => submitPlayerVote(c.name)}
                  className="w-full mb-1"
                >
                  Vote: {c.name}
                </Button>
              ))}
            </div>
          )}

          {gameState.gamePhase === 'final_3_vote' && (
            <div className="mt-2 border-t border-border pt-2">
              <div className="text-xs text-muted-foreground mb-1">Quick Final 3 Vote</div>
              {/* Submit vote against one of the non-player finalists */}
              {nonPlayerActive.map(c => (
                <Button
                  key={`f3-${c.name}`}
                  variant="outline"
                  size="sm"
                  onClick={() => submitFinal3Vote(c.name)}
                  className="w-full mb-1"
                >
                  Vote Out: {c.name}
                </Button>
              ))}
              <Button
                variant="action"
                size="sm"
                onClick={continueFromFinal3Results}
                className="w-full mb-1"
              >
                Apply Final 3 Results → Finale/Elimination
              </Button>
              {/* Simple tie-break helpers: pick a winner among non-player actives */}
              {nonPlayerActive.length >= 2 && (
                <div className="mt-2">
                  <div className="text-[11px] text-muted-foreground mb-1">Tie-break helpers</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const winners = nonPlayerActive.slice(0, 2).map(c => c.name);
                      const eliminated = active.find(
                        c => c.name !== gameState.playerName && !winners.includes(c.name)
                      )?.name || nonPlayerActive[2]?.name || '';
                      handleTieBreakResult(eliminated || '', winners[0], winners[1], 'challenge');
                    }}
                    className="w-full"
                  >
                    Tie-break: Advance first two non-player actives
                  </Button>
                </div>
              )}
            </div>
          )}

          {gameState.gamePhase === 'jury_vote' && (
            <div className="mt-2 border-t border-border pt-2">
              <div className="text-xs text-muted-foreground mb-1">Quick Jury Result</div>
              {active.map(c => (
                <Button
                  key={`jury-${c.name}`}
                  variant="outline"
                  size="sm"
                  onClick={() => endGame(c.name, {}, {})}
                  className="w-full mb-1"
                >
                  Set Winner: {c.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 space-y-2 text-[11px] text-muted-foreground">
          <div>Shortcut: Press Shift+D to toggle this panel.</div>

          {relationshipSnapshot.length > 0 && (
            <div className="border-t border-border pt-2 space-y-1">
              <div className="font-semibold text-[11px]">Relationship snapshot</div>
              {relationshipSnapshot.map((row) => (
                <div key={row.name} className="flex justify-between">
                  <span>{row.name}</span>
                  <span>
                    T {row.averageTrust.toFixed(0)} • S {row.averageSuspicion.toFixed(0)} • P{' '}
                    {row.socialPower.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {allianceSummary.length > 0 && (
            <div className="border-t border-border pt-2 space-y-1">
              <div className="font-semibold text-[11px]">Alliances</div>
              {allianceSummary.map((a) => (
                <div key={a.id} className="flex justify-between">
                  <span>
                    {a.name || a.id}
                    {a.secret && (
                      <span className="ml-1 text-[10px] text-edit-villain/80">
                        (secret)
                      </span>
                    )}
                  </span>
                  <span className="text-right">
                    Str {a.strength} • {a.members} members
                    {typeof a.exposureRisk === 'number' && (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        • Exposure {a.exposureRisk.toFixed(0)}%
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {votingPlans.length > 0 && (
            <div className="border-t border-border pt-2 space-y-1">
              <div className="font-semibold text-[11px]">Current voting plans</div>
              {votingPlans.map((p) => (
                <div key={p.name}>
                  <span className="font-medium">{p.name}</span> → <span>{p.target}</span>
                  {p.source && (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      ({p.source}
                      {typeof p.day === 'number'
                        ? ` • d${p.day}, age ${Math.max(
                            0,
                            gameState.currentDay - p.day
                          )}d`
                        : ''}
                      )
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {lastDebug?.voters && lastDebug.voters.length > 0 && (
            <div className="border-t border-border pt-2 space-y-1">
              <div className="font-semibold text-[11px]">Last vote breakdown</div>
              {lastDebug.voters.slice(0, 6).map((v) => (
                <div key={`${v.voter}-${v.decidedTarget}`}>
                  <span className="font-medium">{v.voter}</span> → {v.decidedTarget}{' '}
                  <span className="text-muted-foreground">({v.via})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};