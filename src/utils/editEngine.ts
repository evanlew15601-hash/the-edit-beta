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

  // Calculate impact from confessional tones
  const toneImpacts = recentConfessionals.reduce((acc, conf) => {
    switch (conf.tone) {
      case 'strategic':
        acc.screenTime += 8;
        acc.approval += 2;
        break;
      case 'aggressive':
        acc.screenTime += 12;
        acc.approval -= 8;
        break;
      case 'vulnerable':
        acc.screenTime += 6;
        acc.approval += 10;
        break;
      case 'humorous':
        acc.screenTime += 4;
        acc.approval += 6;
        break;
      case 'dramatic':
        acc.screenTime += 15;
        acc.approval -= 3;
        break;
      default:
        acc.screenTime += 2;
        acc.approval += 1;
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
    weeklyQuote: recentConfessionals[recentConfessionals.length - 1]?.content.slice(0, 80)
  };
};