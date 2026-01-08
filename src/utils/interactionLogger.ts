import { supabase } from '@/integrations/supabase/client';

export type InteractionType =
  | 'conversation'
  | 'dm'
  | 'scheme'
  | 'observation'
  | 'confessional'
  | 'event';

type LogInteractionArgs = {
  day?: number;
  type: InteractionType;
  participants: string[];
  npcName?: string;
  playerName?: string;
  playerMessage: string;
  aiResponse: string;
  tone?: string;
};

// Persist a single interaction to Lovable Cloud's Postgres (via Supabase client).
export async function logInteractionToCloud(args: LogInteractionArgs): Promise<void> {
  const {
    day,
    type,
    participants,
    npcName,
    playerName,
    playerMessage,
    aiResponse,
    tone,
  } = args;

  try {
    const client = supabase as any;
    const { error } = await client.from('interactions').insert({
      day: day ?? null,
      type,
      participants,
      npc_name: npcName ?? null,
      player_name: playerName ?? null,
      player_message: playerMessage,
      ai_response: aiResponse,
      tone: tone ?? null,
    });

    if (error) {
      console.warn('Failed to log interaction to Lovable Cloud:', error);
    }
  } catch (e) {
    console.warn('Error logging interaction to Lovable Cloud:', e);
  }
}