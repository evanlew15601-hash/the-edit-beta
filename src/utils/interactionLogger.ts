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

export async function fetchRecentInteractions(args: {
  npcName: string;
  playerName: string;
  limit?: number;
}): Promise<
  {
    playerMessage: string;
    aiResponse: string;
    createdAt: string;
    type: InteractionType;
  }[]
> {
  const { npcName, playerName, limit = 10 } = args;

  try {
    const client = supabase as any;
    const { data, error } = await client
      .from('interactions')
      .select('player_message, ai_response, created_at, type')
      .eq('npc_name', npcName)
      .eq('player_name', playerName)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !Array.isArray(data)) {
      if (error) {
        console.warn('Failed to fetch interactions from Lovable Cloud:', error);
      }
      return [];
    }

    return data.map((row: any) => ({
      playerMessage: row.player_message || '',
      aiResponse: row.ai_response || '',
      createdAt: row.created_at || '',
      type: row.type as InteractionType,
    }));
  } catch (e) {
    console.warn('Error fetching interactions from Lovable Cloud:', e);
    return [];
  }
}