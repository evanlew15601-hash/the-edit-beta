import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameState } from '@/types/game';
import { TAG_CHOICES } from '@/data/tagChoices';
import { Brain, Heart, Zap, Shield, Target, Clock } from 'lucide-react';
import type { Choice, IntentTag, ToneTag, TopicTag } from '@/types/tagDialogue';

interface TagChoice {
  id: string;
  text: string;
  type: 'strategic' | 'emotional' | 'aggressive' | 'deceptive' | 'neutral';
  consequences: string[];
  cooldown?: number;
}

interface EnhancedTagDialogueEngineProps {
  gameState: GameState;
  onTagTalk: (target: string, choiceId: string, interaction: 'talk' | 'dm' | 'scheme' | 'activity') => void;
}

export const EnhancedTagDialogueEngine = ({ gameState, onTagTalk }: EnhancedTagDialogueEngineProps) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [interactionType, setInteractionType] = useState<'talk' | 'dm' | 'scheme' | 'activity'>('talk');
  const [availableChoices, setAvailableChoices] = useState<TagChoice[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string>('');

  const { contestants, playerName, currentDay, tagChoiceCooldowns = {} } = gameState;

  useEffect(() => {
    if (selectedTarget) {
      generateContextualChoices();
    }
  }, [selectedTarget, interactionType, currentDay]);

  const mapIntentToType = (intent: IntentTag): TagChoice['type'] => {
    switch (intent) {
      case 'BuildAlliance':
      case 'ProbeForInfo':
      case 'RevealSecret':
        return 'strategic';
      case 'BoostMorale':
      case 'Flirt':
      case 'Divert':
        return 'emotional';
      case 'Insult':
        return 'aggressive';
      case 'SowDoubt':
        return 'deceptive';
      case 'Deflect':
      default:
        return 'neutral';
    }
  };

  const personalizeText = (text: string, targetName: string, playerPersona: string) => {
    // Replace hard-coded names like "Alex" or placeholder with the chosen target's name
    const base = text.replace(/Alex/gi, targetName).replace(/\{\{\s*target\s*\}\}/gi, targetName);

    // Persona-driven voice tweaks for the player
    switch (playerPersona) {
      case 'Villain':
      case 'Antagonist':
      case 'Troublemaker':
        return base.replace(/just/g, 'simply').replace(/maybe/g, 'clearly');
      case 'Hero':
      case 'Fan Favorite':
      case 'Contender':
        return base.replace(/idiot/gi, 'short-sighted').replace(/pathetic/gi, 'weak');
      case 'Comic Relief':
      case 'Class Clown':
        return base + ' 😅';
      case 'Mastermind':
      case 'Puppet Master':
      case 'Strategic Player':
        return base.replace(/plan/gi, 'framework').replace(/strategy/gi, 'architecture');
      default:
        return base;
    }
  };

  // Simple deterministic hash for repeatable variant selection
  const stableIndex = (seed: string, modulo: number) => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h) % Math.max(1, modulo);
  };

  const pickVariant = (choice: Choice, playerPersona: string, seedKey?: string): string => {
    // Deterministic persona bucket selection when provided
    const heroLabels = new Set(['Hero', 'Fan Favorite', 'Contender']);
    const villainLabels = new Set(['Villain', 'Antagonist', 'Troublemaker', 'Puppet Master', 'Mastermind']);
    const bucket = heroLabels.has(playerPersona) ? 'Hero' : villainLabels.has(playerPersona) ? 'Villain' : null;

    const deterministic = gameState.aiSettings?.deterministicPersonaVariants;

    if (choice.personaVariants && bucket) {
      const list = choice.personaVariants[bucket as 'Hero' | 'Villain'] || [];
      if (list.length) {
        const idx = deterministic && seedKey ? stableIndex(`${seedKey}:${bucket}:${choice.choiceId}`, list.length) : Math.floor(Math.random() * list.length);
        return list[idx];
      }
    }
    const variants = choice.textVariants || [];
    if (!variants.length) return '';
    const idx = deterministic && seedKey ? stableIndex(`${seedKey}:${choice.choiceId}`, variants.length) : Math.floor(Math.random() * variants.length);
    return variants[idx];
  };

  const toTagChoice = (choice: Choice, targetName: string): TagChoice => {
    const seedKey = `${gameState.playerName}:${targetName}:${gameState.currentDay}`;
    const raw = pickVariant(choice, gameState.editPerception.persona, seedKey);
    const text = personalizeText(raw, targetName, gameState.editPerception.persona);
    const type = mapIntentToType(choice.intent);
    const cooldown = choice.cooldownDays || 0;
    // Lightweight consequence hints based on intent
    const consequences = (() => {
      switch (choice.intent) {
        case 'BuildAlliance':
          return ['May strengthen trust', 'Could create visible ties'];
        case 'ProbeForInfo':
          return ['Gain intel', 'May raise suspicion'];
        case 'SowDoubt':
          return ['Undermine opponent', 'Risk blowback'];
        case 'BoostMorale':
          return ['Improve mood', 'Minimal strategic impact'];
        case 'Flirt':
          return ['Build bond', 'May shift perception'];
        case 'Insult':
          return ['Increase tension', 'Potential social fallout'];
        case 'MakeJoke':
          return ['Lighten mood', 'May seem unserious'];
        case 'RevealSecret':
          return ['Share leverage', 'Risk trust if exposed'];
        case 'Deflect':
          return ['Avoid topic', 'May seem evasive'];
        case 'Divert':
          return ['Change focus', 'Reduce pressure'];
        default:
          return [];
      }
    })();
    return {
      id: choice.choiceId,
      text,
      type,
      consequences,
      cooldown,
    };
  };

  const generateContextualChoices = () => {
    const target = contestants.find(c => c.name === selectedTarget);
    if (!target) return;

    // Base choices from data filtered by interaction type
    const baseChoicesFromData: TagChoice[] = TAG_CHOICES
      .filter((c: Choice) => (c.interactionTypes || []).includes(interactionType))
      .map((c: Choice) => toTagChoice(c, target.name));

    // Enhanced choices based on relationship and context
    const enhancedChoices: TagChoice[] = [
      ...baseChoicesFromData,

      // High trust relationships
      ...(target.psychProfile.trustLevel > 70 ? [
        {
          id: `share-strategy-${target.name}`,
          text: `Share strategic information with ${target.name}`,
          type: 'strategic' as const,
          consequences: ['Strengthen trust', 'Risk information leak'],
          cooldown: 2
        },
        {
          id: `coordinate-votes-${target.name}`,
          text: `Coordinate future voting with ${target.name}`,
          type: 'strategic' as const,
          consequences: ['Voting alliance formed', 'May appear too close'],
          cooldown: 4
        },
        {
          id: `deep-convo-${target.name}`,
          text: `Have a deep personal conversation with ${target.name}`,
          type: 'emotional' as const,
          consequences: ['Strengthen personal bond', 'Learn their motivations'],
          cooldown: 3
        }
      ] : []),

      // Medium trust
      ...(target.psychProfile.trustLevel >= 30 && target.psychProfile.trustLevel <= 70 ? [
        {
          id: `test-loyalty-${target.name}`,
          text: `Subtly test ${target.name}'s loyalty`,
          type: 'strategic' as const,
          consequences: ['Gauge true intentions', 'May arouse suspicion'],
          cooldown: 3
        },
        {
          id: `build-rapport-${target.name}`,
          text: `Work on building stronger rapport with ${target.name}`,
          type: 'emotional' as const,
          consequences: ['Improved relationship', 'Time investment'],
          cooldown: 1
        },
        {
          id: `casual-alliance-${target.name}`,
          text: `Propose a casual voting agreement with ${target.name}`,
          type: 'strategic' as const,
          consequences: ['Temporary protection', 'Shallow commitment'],
          cooldown: 2
        },
        {
          id: `gather-intel-${target.name}`,
          text: `Fish for information about ${target.name}'s plans`,
          type: 'strategic' as const,
          consequences: ['Learn their strategy', 'They may become guarded'],
          cooldown: 2
        }
      ] : []),

      // Low trust
      ...(target.psychProfile.trustLevel < 30 ? [
        {
          id: `damage-control-${target.name}`,
          text: `Attempt damage control with ${target.name}`,
          type: 'emotional' as const,
          consequences: ['May salvage relationship', 'Could appear desperate'],
          cooldown: 2
        },
        {
          id: `misinformation-${target.name}`,
          text: `Feed ${target.name} subtle misinformation`,
          type: 'deceptive' as const,
          consequences: ['Confuse their strategy', 'Risk being caught'],
          cooldown: 5
        },
        {
          id: `distance-yourself-${target.name}`,
          text: `Politely distance yourself from ${target.name}`,
          type: 'neutral' as const,
          consequences: ['Avoid drama', 'May burn bridge completely'],
          cooldown: 7
        },
        {
          id: `fake-reconciliation-${target.name}`,
          text: `Pretend to make amends with ${target.name}`,
          type: 'deceptive' as const,
          consequences: ['Temporary peace', 'High risk if discovered'],
          cooldown: 4
        }
      ] : []),

      // Disposition-based choices
      ...(target.psychProfile.disposition.includes('Paranoid') ? [
        {
          id: `reassure-${target.name}`,
          text: `Reassure ${target.name} about alliance loyalty`,
          type: 'emotional' as const,
          consequences: ['Calm paranoid thoughts', 'May not believe you'],
          cooldown: 2
        },
        {
          id: `exploit-paranoia-${target.name}`,
          text: `Subtly validate ${target.name}'s suspicions`,
          type: 'deceptive' as const,
          consequences: ['Increase their paranoia', 'High risk of backfire'],
          cooldown: 4
        }
      ] : []),

      ...(target.psychProfile.disposition.includes('Strategic') ? [
        {
          id: `strategic-discussion-${target.name}`,
          text: `Engage in deep strategic discussion with ${target.name}`,
          type: 'strategic' as const,
          consequences: ['Learn their strategy', 'Reveal your own thinking'],
          cooldown: 3
        }
      ] : []),

      ...(target.psychProfile.disposition.includes('Social') ? [
        {
          id: `social-bonding-${target.name}`,
          text: `Focus on personal connection with ${target.name}`,
          type: 'emotional' as const,
          consequences: ['Strong personal bond', 'May seem non-strategic'],
          cooldown: 1
        }
      ] : []),

      // Game phase specific choices
      ...(gameState.gamePhase === 'player_vote' || gameState.currentDay === gameState.nextEliminationDay ? [
        {
          id: `vote-coordination-${target.name}`,
          text: `Coordinate elimination vote with ${target.name}`,
          type: 'strategic' as const,
          consequences: ['Voting bloc formed', 'Clear strategic move'],
          cooldown: 7
        }
      ] : []),

      // Alliance-based choices
      ...(gameState.alliances.some(a => a.members.includes(target.name) && a.members.includes(playerName)) ? [
        {
          id: `alliance-planning-${target.name}`,
          text: `Plan alliance strategy with ${target.name}`,
          type: 'strategic' as const,
          consequences: ['Strengthen alliance', 'Exclude other members'],
          cooldown: 2
        }
      ] : []),

      // Additional variety for DM and Scheme formats
      ...(interactionType === 'dm' ? [
        {
          id: `backchannel-${target.name}`,
          text: `Start a backchannel with ${target.name}—quiet updates only`,
          type: 'strategic' as const,
          consequences: ['Private intel flow', 'Risk logs leaking'],
          cooldown: 2
        },
        {
          id: `midnight-checkin-${target.name}`,
          text: `Late-night check-in with ${target.name}—reset trust`,
          type: 'emotional' as const,
          consequences: ['Rebuild rapport', 'May look suspicious'],
          cooldown: 2
        }
      ] : []),

      ...(interactionType === 'scheme' ? [
        {
          id: `fake-leak-${target.name}`,
          text: `Prime ${target.name} with a controlled fake leak`,
          type: 'deceptive' as const,
          consequences: ['Test their loyalty', 'High risk if traced'],
          cooldown: 4
        },
        {
          id: `misdirect-${target.name}`,
          text: `Misdirect ${target.name} toward a decoy target`,
          type: 'strategic' as const,
          consequences: ['Protect true plan', 'May reduce trust'],
          cooldown: 3
        }
      ] : [])
    ];

    // Filter out choices on cooldown
    const filteredChoices = enhancedChoices.filter(choice => {
      const cooldownEnd = tagChoiceCooldowns[choice.id];
      return !cooldownEnd || currentDay >= cooldownEnd;
    });

    setAvailableChoices(filteredChoices.slice(0, 10)); // Slightly more variety
  };

  const getChoiceIcon = (type: TagChoice['type']) => {
    switch (type) {
      case 'strategic': return <Brain className="w-4 h-4 text-blue-500" />;
      case 'emotional': return <Heart className="w-4 h-4 text-pink-500" />;
      case 'aggressive': return <Zap className="w-4 h-4 text-red-500" />;
      case 'deceptive': return <Target className="w-4 h-4 text-purple-500" />;
      case 'neutral': return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getChoiceColor = (type: TagChoice['type']) => {
    // Dark-theme friendly tints to avoid white-on-white text blending
    switch (type) {
      case 'strategic': return 'border-blue-400/40 hover:bg-blue-900/20';
      case 'emotional': return 'border-pink-400/40 hover:bg-pink-900/20';
      case 'aggressive': return 'border-red-400/40 hover:bg-red-900/20';
      case 'deceptive': return 'border-purple-400/40 hover:bg-purple-900/20';
      case 'neutral': return 'border-gray-500/40 hover:bg-muted';
    }
  };

  const getRemainingCooldown = (choiceId: string) => {
    const cooldownEnd = tagChoiceCooldowns[choiceId];
    return cooldownEnd ? Math.max(0, cooldownEnd - currentDay) : 0;
  };

  const availableTargets = contestants.filter(c => !c.isEliminated && c.name !== playerName);

  if (availableTargets.length === 0) return null;

  // Tone-aware preview based on target heuristics
  const computeOutcomePreview = (choiceId: string, targetName: string) => {
    const target = contestants.find(c => c.name === targetName);
    if (!target) return { trust: 0, suspicion: 0, influence: 0, entertainment: 0 };
    // Heuristics from psychProfile and interaction type
    const disp = target.psychProfile.disposition.join(' ').toLowerCase();
    const baseTrust = interactionType === 'talk' ? 0.1 : interactionType === 'dm' ? 0.12 : interactionType === 'scheme' ? -0.05 : 0.08;
    const baseSusp = interactionType === 'scheme' ? 0.12 : interactionType === 'dm' ? 0.06 : 0.04;
    const isParanoid = disp.includes('paranoid');
    const isStrategic = disp.includes('strategic');
    const isSocial = disp.includes('social');

    let trust = baseTrust;
    let suspicion = baseSusp;
    let influence = isStrategic ? 0.1 : 0.05;
    let entertainment = isSocial ? 0.08 : 0.05;

    // Tweak by intent from choiceId suffixes
    if (choiceId.includes('BUILD_ALLY')) { trust += 0.08; suspicion -= 0.04; }
    if (choiceId.includes('SOW_DOUBT')) { trust -= 0.06; suspicion += isParanoid ? 0.12 : 0.08; influence += 0.1; }
    if (choiceId.includes('REVEAL')) { trust += 0.06; suspicion += 0.03; influence += 0.08; }
    if (choiceId.includes('INSULT')) { trust -= 0.12; suspicion += 0.1; entertainment += 0.06; }
    if (choiceId.includes('FLIRT')) { trust += 0.05; suspicion -= 0.02; entertainment += 0.1; }
    if (choiceId.includes('JOKE')) { entertainment += 0.12; trust += 0.02; }
    if (choiceId.includes('DEFLECT')) { trust -= 0.02; suspicion += 0.05; }
    if (choiceId.includes('PROBE')) { influence += 0.08; suspicion += isParanoid ? 0.08 : 0.05; }

    return {
      trust: Math.round(trust * 100) / 100,
      suspicion: Math.round(suspicion * 100) / 100,
      influence: Math.round(influence * 100) / 100,
      entertainment: Math.round(entertainment * 100) / 100,
    };
  };

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Enhanced Tag Dialogue
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Advanced conversation strategies with deep consequences
        </p>
      </div>

      {/* Target and Interaction Selection */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Target</label>
          <select 
            value={selectedTarget} 
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md text-sm bg-input focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Select target...</option>
            {availableTargets.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Interaction</label>
          <select 
            value={interactionType} 
            onChange={(e) => setInteractionType(e.target.value as any)}
            className="w-full px-3 py-2 border border-border rounded-md text-sm bg-input focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="talk">Talk</option>
            <option value="dm">Direct Message</option>
            <option value="scheme">Scheme</option>
            <option value="activity">Activity</option>
          </select>
        </div>
      </div>

      {selectedTarget && (
        <>
          <ScrollArea className="h-64 mb-4">
            <div className="space-y-3">
              {availableChoices.map((choice) => {
                const cooldownDays = getRemainingCooldown(choice.id);
                const isOnCooldown = cooldownDays > 0;
                const outcome = computeOutcomePreview(choice.id, selectedTarget);
                
                return (
                  <div 
                    key={choice.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all bg-card/50 shadow-sm ${
                      getChoiceColor(choice.type)
                    } ${selectedChoice === choice.id ? 'ring-2 ring-primary' : ''} ${
                      isOnCooldown ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={() => !isOnCooldown && setSelectedChoice(choice.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getChoiceIcon(choice.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {choice.type}
                          </Badge>
                          {choice.cooldown && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {choice.cooldown}d cooldown
                            </Badge>
                          )}
                          {isOnCooldown && (
                            <Badge variant="destructive" className="text-xs">
                              {cooldownDays}d remaining
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium mb-2">{choice.text}</p>
                        <div className="space-y-1">
                          {choice.consequences.map((consequence, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground">
                              • {consequence}
                            </p>
                          ))}
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          Likely effects: 
                          <span className={outcome.trust > 0 ? 'text-edit-hero ml-1' : 'text-edit-villain ml-1'}>
                            Trust {outcome.trust > 0 ? '+' : ''}{outcome.trust}
                          </span>
                          <span className={outcome.suspicion > 0 ? 'text-edit-villain ml-2' : 'text-edit-hero ml-2'}>
                            Suspicion {outcome.suspicion > 0 ? '+' : ''}{outcome.suspicion}
                          </span>
                          <span className="ml-2">
                            Influence {outcome.influence > 0 ? '+' : ''}{outcome.influence}
                          </span>
                          <span className="ml-2">
                            Entertainment {outcome.entertainment > 0 ? '+' : ''}{outcome.entertainment}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setSelectedChoice('');
                setSelectedTarget('');
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="action" 
              className="flex-1"
              disabled={!selectedChoice}
              onClick={() => {
                if (selectedChoice && selectedTarget) {
                  onTagTalk(selectedTarget, selectedChoice, interactionType);
                  setSelectedChoice('');
                  setSelectedTarget('');
                }
              }}
            >
              Execute Choice
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};