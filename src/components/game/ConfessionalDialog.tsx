import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameState } from '@/types/game';
import { EnhancedConfessionalEngine } from '@/utils/enhancedConfessionalEngine';
import { generateResponseOptions } from '@/utils/confessionalResponseGenerator';
import { RefreshCw, Zap } from 'lucide-react';

interface ConfessionalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, tone: string) => void;
  gameState: GameState;
}

export const ConfessionalDialog = ({ isOpen, onClose, onSubmit, gameState }: ConfessionalDialogProps) => {
  const [content, setContent] = useState('');
  const [tone, setTone] = useState<string>('');
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);
  const [availablePrompts, setAvailablePrompts] = useState<any[]>([]);
  const [responseOptions, setResponseOptions] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      const prompts = EnhancedConfessionalEngine.generateDynamicPrompts(gameState);
      setAvailablePrompts(prompts);
      if (prompts.length > 0) {
        setSelectedPrompt(prompts[0]);
        // Generate response options once when prompt is selected
        setResponseOptions(generateResponseOptions(prompts[0], gameState));
      }
      setContent('');
      setTone('');
    }
  }, [isOpen]);

  // Update response options only when prompt changes
  useEffect(() => {
    if (selectedPrompt) {
      setResponseOptions(generateResponseOptions(selectedPrompt, gameState));
    }
  }, [selectedPrompt]);

  const handleSubmit = () => {
    if (content && tone) {
      onSubmit(content, tone);
      setContent('');
      setTone('');
    }
  };

  const toneOptions = [
    { value: 'strategic', label: 'Strategic', description: 'Explain your game plan and reasoning', impact: '+Screen Time, +Approval' },
    { value: 'vulnerable', label: 'Vulnerable', description: 'Share personal struggles and emotions', impact: '+Approval, +Sympathy' },
    { value: 'aggressive', label: 'Aggressive', description: 'Attack others or defend yourself harshly', impact: '+Screen Time, -Approval' },
    { value: 'humorous', label: 'Humorous', description: 'Keep things light and entertaining', impact: '+Approval, Comic Relief edit' },
    { value: 'dramatic', label: 'Dramatic', description: 'Create moments that demand attention', impact: '++Screen Time, Variable approval' },
    { value: 'evasive', label: 'Evasive', description: 'Avoid revealing too much information', impact: '-Screen Time, Mysterious edit' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-surveillance-confessional" />
            Diary Room Confessional
          </DialogTitle>
          <DialogDescription>Dynamic prompts based on current game state. Your response affects your edit.</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
          <div className="bg-surveillance-confessional/20 border border-surveillance-confessional/40 rounded p-4">
            <p className="text-sm text-foreground mb-2">
              🎥 <strong>RECORDING</strong> - You are alone in the diary room. 
            </p>
            <p className="text-xs text-muted-foreground">
              Not all confessionals make the final edit. Drama, strategy, and authentic moments are more likely to be shown.
            </p>
          </div>

          {/* Dynamic Prompt Selection */}
          {availablePrompts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Producer Prompt</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newPrompts = EnhancedConfessionalEngine.generateDynamicPrompts(gameState);
                      setAvailablePrompts(newPrompts);
                      const randomPrompt = newPrompts[Math.floor(Math.random() * newPrompts.length)];
                      setSelectedPrompt(randomPrompt);
                      // Clear selections when new prompt is generated
                      setContent('');
                      setTone('');
                    }}
                    className="flex items-center gap-1"
                  >
                  <RefreshCw className="w-3 h-3" />
                  Generate New Prompt
                </Button>
              </div>
              
              {selectedPrompt && (
                <div className="bg-muted border border-border rounded p-3">
                  <p className="text-sm font-medium mb-1">{selectedPrompt.prompt}</p>
                  {selectedPrompt.followUp && (
                    <p className="text-xs text-muted-foreground">{selectedPrompt.followUp}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-surveillance-confessional">
                      Edit Potential: {selectedPrompt.editPotential}/10
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Category: {selectedPrompt.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Choose Your Response</label>
            {selectedPrompt ? (
              <div className="space-y-2">
                {responseOptions.map((option: string, index: number) => (
                  <button
                    key={`${selectedPrompt.id}-${index}`}
                    onClick={() => setContent(option)}
                    className={`p-3 text-left border border-border rounded transition-colors w-full ${
                      content === option 
                        ? 'bg-surveillance-confessional/10 border-surveillance-confessional' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="text-sm">{option}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground border border-border rounded">
                Select a prompt above to see response options
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Delivery Style</label>
            <div className="grid grid-cols-1 gap-3">
              {toneOptions.map((option) => {
                const isRecommended = selectedPrompt?.suggestedTones?.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => setTone(option.value)}
                    className={`p-3 text-left border border-border rounded transition-colors ${
                      tone === option.value 
                        ? 'bg-surveillance-confessional/10 border-surveillance-confessional' 
                        : isRecommended
                        ? 'hover:bg-primary/5 border-primary/30'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{option.label}</div>
                      {isRecommended && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">{option.description}</div>
                    <div className="text-xs text-surveillance-confessional">{option.impact}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="confessional" 
              onClick={handleSubmit} 
              disabled={!content || !tone}
              className="flex-1"
            >
              Record Confessional
            </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};