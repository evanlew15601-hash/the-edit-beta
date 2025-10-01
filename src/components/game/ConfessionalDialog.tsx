
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameState } from '@/types/game';
import { EnhancedConfessionalEngine, DynamicConfessionalPrompt } from '@/utils/enhancedConfessionalEngine';
import { generateResponseOptions } from '@/utils/confessionalResponseGenerator';
import { RefreshCw, Zap, Camera } from 'lucide-react';

interface ConfessionalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, tone: string) => void;
  gameState: GameState;
}

export const ConfessionalDialog = ({ isOpen, onClose, onSubmit, gameState }: ConfessionalDialogProps) => {
  const [content, setContent] = useState('');
  const [tone, setTone] = useState<string>('');
  const [selectedPrompt, setSelectedPrompt] = useState<DynamicConfessionalPrompt | null>(null);
  const [availablePrompts, setAvailablePrompts] = useState<DynamicConfessionalPrompt[]>([]);
  const [responseOptions, setResponseOptions] = useState<string[]>([]);

  // Initialize prompts when dialog opens
  useEffect(() => {
    if (isOpen && gameState) {
      console.log('Generating confessional prompts for game state:', gameState);
      const prompts = EnhancedConfessionalEngine.generateDynamicPrompts(gameState);
      console.log('Generated prompts:', prompts);
      
      setAvailablePrompts(prompts);
      
      if (prompts.length > 0) {
        const firstPrompt = prompts[0];
        setSelectedPrompt(firstPrompt);
        
        const responses = generateResponseOptions(firstPrompt, gameState);
        console.log('Generated response options:', responses);
        setResponseOptions(responses);
      }
      
      // Reset selections
      setContent('');
      setTone('');
    }
  }, [isOpen, gameState]);

  // Generate new response options when prompt changes
  useEffect(() => {
    if (selectedPrompt && gameState) {
      const responses = generateResponseOptions(selectedPrompt, gameState);
      setResponseOptions(responses);
    }
  }, [selectedPrompt, gameState]);

  const handleGenerateNewPrompts = () => {
    if (!gameState) return;
    
    const newPrompts = EnhancedConfessionalEngine.generateDynamicPrompts(gameState);
    setAvailablePrompts(newPrompts);
    
    if (newPrompts.length > 0) {
      const randomPrompt = newPrompts[Math.floor(Math.random() * newPrompts.length)];
      setSelectedPrompt(randomPrompt);
    }
    
    // Clear selections when new prompt is generated
    setContent('');
    setTone('');
  };

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

  // Debug logging
  console.log('ConfessionalDialog state:', {
    isOpen,
    availablePrompts: availablePrompts.length,
    selectedPrompt: selectedPrompt?.id,
    responseOptions: responseOptions.length,
    content,
    tone
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-surveillance-confessional" />
            Diary Room Confessional
          </DialogTitle>
          <DialogDescription>
            Share your thoughts and strategy. Your tone affects how you're portrayed in the edit.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            <div className="bg-surveillance-confessional/20 border border-surveillance-confessional/40 rounded p-4">
              <p className="text-sm text-foreground mb-2">
                🎥 <strong>RECORDING</strong> - You are alone in the diary room.
              </p>
              <p className="text-xs text-muted-foreground">
                Your confessionals shape how viewers see you. Drama and strategy are more likely to be shown.
              </p>
            </div>

            {/* Prompt Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Producer Prompt</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateNewPrompts}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  New Prompts
                </Button>
              </div>
              
              {availablePrompts.length > 0 ? (
                <div className="space-y-2">
                  {availablePrompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      onClick={() => setSelectedPrompt(prompt)}
                      className={`p-3 text-left border border-border rounded transition-colors w-full ${
                        selectedPrompt?.id === prompt.id
                          ? 'bg-surveillance-confessional/10 border-surveillance-confessional'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">{prompt.prompt}</div>
                      {prompt.followUp && (
                        <div className="text-xs text-muted-foreground">{prompt.followUp}</div>
                      )}
                      {prompt.producerTactic && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                          <Camera className="w-3 h-3" />
                          <span>Producer Direction: {prompt.producerTactic.kind.replace('_', ' ')}</span>
                          {prompt.producerTactic.note && (
                            <span className="text-muted-foreground ml-1">— {prompt.producerTactic.note}</span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-surveillance-confessional">
                          Edit Potential: {prompt.editPotential}/10
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {prompt.category.replace('_', ' ')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground border border-border rounded">
                  No prompts available. Try refreshing or check your game state.
                </div>
              )}
            </div>

            {/* Response Options */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Choose Your Response</label>
              {responseOptions.length > 0 ? (
                <div className="space-y-2">
                  {responseOptions.map((option: string, index: number) => (
                    <button
                      key={`${selectedPrompt?.id || 'default'}-${index}`}
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
                  {selectedPrompt ? 'Generating response options...' : 'Select a prompt above to see response options'}
                </div>
              )}
            </div>

            {/* Tone Selection */}
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
