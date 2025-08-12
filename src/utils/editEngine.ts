import { EditPerception, Confessional } from '@/types/game';

export const calculateEditPerception = (
  confessionals: Confessional[],
  currentPerception: EditPerception,
  currentDay: number
): EditPerception => {
  // Get recent confessionals (last 3 days)
  const recentConfessionals = confessionals.filter(c => c.day >= currentDay - 2);
  
  if (recentConfessionals.length === 0) {
    return {
      ...currentPerception,
      screenTimeIndex: Math.max(0, currentPerception.screenTimeIndex - 5) // Decrease if no confessionals
    };
  }

  // Calculate impact from confessional tones with light recency weighting
  const toneImpacts = recentConfessionals.reduce((acc, conf) => {
    const recencyBoost = conf.day === currentDay ? 2 : conf.day === currentDay - 1 ? 1.5 : 1;
    switch (conf.tone) {
      case 'strategic':
        acc.screenTime += 6 * recencyBoost;
        acc.approval += 2 * recencyBoost;
        break;
      case 'aggressive':
        acc.screenTime += 10 * recencyBoost;
        acc.approval -= 6 * recencyBoost;
        break;
      case 'vulnerable':
        acc.screenTime += 5 * recencyBoost;
        acc.approval += 8 * recencyBoost;
        break;
      case 'humorous':
        acc.screenTime += 4 * recencyBoost;
        acc.approval += 5 * recencyBoost;
        break;
      case 'dramatic':
        acc.screenTime += 12 * recencyBoost;
        acc.approval -= 2 * recencyBoost;
        break;
      default:
        acc.screenTime += 2 * recencyBoost;
        acc.approval += 1 * recencyBoost;
    }
    // Leverage explicit editImpact when present
    if (typeof (conf as any).editImpact === 'number') {
      acc.screenTime += Math.max(0, (conf as any).editImpact);
      acc.approval += Math.sign((conf as any).editImpact) * Math.min(5, Math.abs((conf as any).editImpact));
    }
    return acc;
  }, { screenTime: 0, approval: 0 });

  // Apply changes with bounds
  const newScreenTime = Math.max(0, Math.min(100, 
    currentPerception.screenTimeIndex + toneImpacts.screenTime
  ));
  const newApproval = Math.max(-100, Math.min(100, 
    currentPerception.audienceApproval + toneImpacts.approval
  ));

  // Determine persona based on metrics
  let persona: EditPerception['persona'];
  if (newScreenTime < 20) {
    persona = 'Ghosted';
  } else if (newScreenTime < 40) {
    persona = 'Underedited';
  } else if (newApproval > 30) {
    persona = 'Hero';
  } else if (newApproval < -30) {
    persona = 'Villain';
  } else if (recentConfessionals.some(c => c.tone === 'humorous')) {
    persona = 'Comic Relief';
  } else {
    persona = 'Dark Horse';
  }

  return {
    screenTimeIndex: newScreenTime,
    audienceApproval: newApproval,
    persona,
    lastEditShift: newApproval - currentPerception.audienceApproval,
    weeklyQuote: (recentConfessionals
      .slice()
      .sort((a, b) => (b.editImpact ?? 0) - (a.editImpact ?? 0) || (b.content?.length ?? 0) - (a.content?.length ?? 0) || b.day - a.day)[0]?.content || '')
      .slice(0, 160)
  };
};
