import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { GameState, Alliance } from '@/types/game';
import { AlliancePlanEngine, AlliancePlan, MemberResponse } from '@/utils/alliancePlanEngine';
import { 
  Brain, 
  Users, 
  Target, 
  Info, 
  Heart, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock
} from 'lucide-react';

interface AlliancePlanningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  alliance: Alliance;
  gameState: GameState;
  onSubmitPlan: (plan: AlliancePlan, responses: Record<string, MemberResponse>) => void;
}

export const AlliancePlanningDialog = ({ 
  isOpen, 
  onClose, 
  alliance, 
  gameState, 
  onSubmitPlan 
}: AlliancePlanningDialogProps) => {
  const [availablePlans, setAvailablePlans] = useState<AlliancePlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<AlliancePlan | null>(null);
  const [memberResponses, setMemberResponses] = useState<Record<string, MemberResponse>>({});
  const [showResponses, setShowResponses] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const plans = AlliancePlanEngine.generateAlliancePlans(alliance, gameState);
      setAvailablePlans(plans);
      setSelectedPlan(null);
      setShowResponses(false);
    }
  }, [isOpen, alliance, gameState]);

  const handlePlanSelect = (plan: AlliancePlan) => {
    setSelectedPlan(plan);
    const responses = AlliancePlanEngine.getMemberResponses(plan, alliance, gameState);
    setMemberResponses(responses);
    setShowResponses(true);
  };

  const handleSubmitPlan = () => {
    if (selectedPlan) {
      onSubmitPlan(selectedPlan, memberResponses);
      onClose();
    }
  };

  const getPlanTypeIcon = (type: AlliancePlan['type']) => {
    switch (type) {
      case 'voting': return <Target className="w-4 h-4 text-red-500" />;
      case 'strategic': return <Brain className="w-4 h-4 text-blue-500" />;
      case 'information': return <Info className="w-4 h-4 text-purple-500" />;
      case 'social': return <Heart className="w-4 h-4 text-pink-500" />;
    }
  };

  const getDifficultyColor = (difficulty: AlliancePlan['difficulty']) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900';
      case 'hard': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900';
    }
  };

  const getResponseIcon = (response: MemberResponse['response']) => {
    switch (response) {
      case 'accept': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'conditional': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'reject': return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const calculatePlanSupport = () => {
    if (!selectedPlan) return 0;
    const responses = Object.values(memberResponses);
    const acceptCount = responses.filter(r => r.response === 'accept').length;
    const conditionalCount = responses.filter(r => r.response === 'conditional').length;
    return Math.round(((acceptCount + conditionalCount * 0.7) / responses.length) * 100);
  };

  const supportPercentage = calculatePlanSupport();
  const meetsRequirement = selectedPlan ? supportPercentage >= selectedPlan.requiredSupport : false;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Alliance Planning: {alliance.name || `Alliance ${alliance.id.slice(-4)}`}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Available Plans */}
          <div>
            <h3 className="font-medium mb-3">Available Plans</h3>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {availablePlans.map((plan) => (
                  <Card 
                    key={plan.id}
                    className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedPlan?.id === plan.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handlePlanSelect(plan)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getPlanTypeIcon(plan.type)}
                      <h4 className="font-medium text-sm">{plan.title}</h4>
                      <Badge 
                        variant="outline"
                        className={`text-xs ml-auto ${getDifficultyColor(plan.difficulty)}`}
                      >
                        {plan.difficulty}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-3">{plan.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Day {plan.targetDay}
                      </span>
                      <span>
                        {plan.requiredSupport}% support needed
                      </span>
                    </div>
                    
                    {plan.evidence && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs">
                        <strong>Evidence:</strong> {plan.evidence}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Plan Details & Member Responses */}
          <div>
            {selectedPlan ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-medium">Plan Details & Member Responses</h3>
                  <Badge 
                    variant={meetsRequirement ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {supportPercentage}% support
                  </Badge>
                </div>

                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {/* Plan Benefits & Risks */}
                    <Card className="p-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <h5 className="font-medium text-xs text-green-600 mb-1">Benefits</h5>
                          {selectedPlan.benefits.map((benefit, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground">• {benefit}</p>
                          ))}
                        </div>
                        <div>
                          <h5 className="font-medium text-xs text-red-600 mb-1">Risks</h5>
                          {selectedPlan.risks.map((risk, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground">• {risk}</p>
                          ))}
                        </div>
                      </div>
                    </Card>

                    {/* Member Roles */}
                    <Card className="p-3">
                      <h5 className="font-medium text-xs mb-2">Member Roles</h5>
                      {Object.entries(selectedPlan.memberRoles).map(([member, role]) => (
                        <div key={member} className="mb-2">
                          <p className="text-xs font-medium">{member}:</p>
                          <p className="text-xs text-muted-foreground ml-2">{role}</p>
                        </div>
                      ))}
                    </Card>

                    {/* Member Responses */}
                    {showResponses && (
                      <div className="space-y-3">
                        <h5 className="font-medium text-xs">Member Responses</h5>
                        {Object.values(memberResponses).map((response) => (
                          <Card key={response.memberId} className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              {getResponseIcon(response.response)}
                              <span className="font-medium text-sm">{response.memberId}</span>
                              <Badge 
                                variant={
                                  response.response === 'accept' ? 'default' :
                                  response.response === 'conditional' ? 'secondary' : 'destructive'
                                }
                                className="text-xs ml-auto"
                              >
                                {response.response}
                              </Badge>
                            </div>
                            
                            <p className="text-xs text-muted-foreground mb-2">
                              "{response.reasoning}"
                            </p>
                            
                            {response.conditions && (
                              <div className="text-xs">
                                <p className="font-medium text-yellow-600 mb-1">Conditions:</p>
                                {response.conditions.map((condition, idx) => (
                                  <p key={idx} className="text-muted-foreground">• {condition}</p>
                                ))}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 mt-2 text-xs">
                              <span className="text-muted-foreground">Trust Impact:</span>
                              <span className={
                                response.trustImpact > 0 ? 'text-green-600' :
                                response.trustImpact < 0 ? 'text-red-600' : 'text-gray-600'
                              }>
                                {response.trustImpact > 0 ? '+' : ''}{response.trustImpact}
                              </span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    variant="action"
                    onClick={handleSubmitPlan}
                    disabled={!meetsRequirement}
                    className="flex-1"
                  >
                    {meetsRequirement ? 'Execute Plan' : `Need ${selectedPlan.requiredSupport}% Support`}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                <p>Select a plan to view details and member responses</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};