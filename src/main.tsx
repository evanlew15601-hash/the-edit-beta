import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

if (import.meta.env.MODE !== 'production') {
  // Expose a small debug API on window for manual sanity checks in dev
  import('./utils/debugSanityChecks').then((mod) => {
    (window as any).__rtvDebug = {
      debugRelationshipDecaySanityCheck: mod.debugRelationshipDecaySanityCheck,
      debugAllianceMeetingVotingPlanScenario: mod.debugAllianceMeetingVotingPlanScenario,
      debugNPCVoteSelectionWithBetrayal: mod.debugNPCVoteSelectionWithBetrayal,
    };
  });
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.textContent = "The Edit failed to find a page root.";
} else {
  try {
    createRoot(rootEl).render(<App />);
  } catch (err) {
    rootEl.textContent = `The Edit failed to start: ${err instanceof Error ? err.message : String(err)}`;
  }
}
