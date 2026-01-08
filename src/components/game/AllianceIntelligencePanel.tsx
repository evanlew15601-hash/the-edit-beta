import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameState } from '@/types/game';
import { AllianceIntelligenceEngine } from '@/utils/allianceIntelligenceEngine';
import { Users, Eye, Shield, AlertTriangle, Target, Brain } from 'lucide-react';

interface AllianceIntelligenceProps {
  gameState: GameState;
  selectedAlliance?: string;
}

export const AllianceIntelligencePanel = ({ gameState, selectedAlliance }: AllianceIntelligenceProps) => {
  const [expandedIntel, setExpandedIntel] = useState<string>('');
  const [activeAllianceId, setActiveAllianceId] = useState<string>(() => selectedAlliance || gameState.alliances[0]?.id || '');

  // Keep local selection in sync with props and changing alliance list
  useEffect(() => {
    if (selectedAlliance && selectedAlliance !== activeAllianceId) {
      setActiveAllianceId(selectedAlliance);
      return;
    }
    if (!selectedAlliance && !gameState.alliances.find(a => a.id === activeAllianceId)) {
      setActiveAllianceId(gameState.alliances[0]?.id || '');
    }
  }, [selectedAlliance, activeAllianceId, gameState.alliances]);

  if (!gameState.alliances.length) return null;

  const alliance = gameState.alliances.find(a => a.id === activeAllianceId) || gameState.alliances[0];
  if (!alliance) return null;

  // Use the enhanced intelligence engine
  const allianceIntelligence = AllianceIntelligenceEngine.generateMemberIntelligence(alliance, gameState);
  const filteredIntelligence = AllianceIntelligenceEngine.filterIntelligenceByTrust(allianceIntelligence, alliance);
  const strategicAssessment = AllianceIntelligenceEngine.getAllianceStrategicAssessment(alliance, gameState);

  const getIntelTypeIcon = (type: string) => {
    switch (type) {
      case 'truth': return <Shield className="w-4 h-4 text-green-500" />;
      case 'deception': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'strategic': return <Target className="w-4 h-4 text-blue-500" />;
      case 'social': return <Users className="w-4 h-4 text-purple-500" />;
      default: return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900';
      case 'low': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900';
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-4">
         <h3 className="text-lg font-medium flex items-center gap-2">
           <Users className="w-5 h-5 text-primary" />
           Alliance Intelligence
         </h3>

        {gameState.alliances.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {gameState.alliances.map(a => (
              <Button
                key={a.id}
                variant={a.id === alliance.id ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => {
                  setExpandedIntel('');
                  setActiveAllianceId(a.id);
                }}
              >
                {a.name || `Alliance ${a.id.slice(-4)}`}
              </Button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
          <span>Trust Level: {alliance.strength}%</span>
          <span>•</span>
          <span>{alliance.members.length} members</span>
          <span>•</span>
          <span className={
            strategicAssessment.stability === 'stable' ? 'text-green-600' :
            strategicAssessment.stability === 'unstable' ? 'text-yellow-600' : 'text-red-600'
          }>
            {strategicAssessment.stability}
          </span>
        </div>
      </div>

      {/* Strategic Assessment */}
      <div className="mb-4 p-3 bg-muted rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-primary" />
          <h4 className="font-medium text-sm">Strategic Assessment</h4>
        </div>
        <p className="text-xs text-muted-foreground mb-2">{strategicAssessment.recommendation}</p>
        
        {strategicAssessment.risks.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-medium text-red-600 mb-1">Risks:</p>
            {strategicAssessment.risks.map((risk, idx) => (
              <p key={idx} className="text-xs text-muted-foreground">• {risk}</p>
            ))}
          </div>
        )}
        
        {strategicAssessment.opportunities.length > 0 && (
          <div>
            <p className="text-xs font-medium text-green-600 mb-1">Opportunities:</p>
            {strategicAssessment.opportunities.map((opp, idx) => (
              <p key={idx} className="text-xs text-muted-foreground">• {opp}</p>
            ))}
          </div>
        )}
      </div>

      <ScrollArea className="h-64">
        <div className="space-y-4">
          {alliance.members
            .filter(member => member !== gameState.playerName)
            .map(member => {
              const intel = filteredIntelligence[member] || [];
              const isExpanded = expandedIntel === member;
              
              return (
                <div key={member} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground">{member}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedIntel(isExpanded ? '' : member)}
                    >
                      {isExpanded ? 'Hide' : 'View'} Intel ({intel.length})
                    </Button>
                  </div>
                  
                  {isExpanded && (
                    <div className="space-y-2 mt-3">
                      {intel.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          Insufficient intelligence available - need more interactions or higher alliance trust
                        </p>
                      ) : (
                        intel.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2 bg-muted rounded">
                            {getIntelTypeIcon(item.type)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getConfidenceColor(item.confidence)}`}
                                >
                                  {item.confidence} confidence
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {item.source}
                                </Badge>
                              </div>
                              <p className="text-sm text-foreground">{item.info}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </ScrollArea>
    </Card>
  );
};