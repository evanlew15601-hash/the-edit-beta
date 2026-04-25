export const betaDebugBuildEnabled = () => {
  if (import.meta.env.VITE_ENABLE_BETA_DEBUG === '1') return true;
  // Auto-enable in Lovable preview/sandbox deploys so QA can use debug tools.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (
      host.endsWith('.lovable.app') ||
      host.endsWith('.lovable.dev') ||
      host.endsWith('.lovableproject.com') ||
      host === 'localhost' ||
      host === '127.0.0.1'
    ) {
      return true;
    }
  }
  return false;
};

export const canUseDebugUI = () => {
  return import.meta.env.MODE !== 'production' || betaDebugBuildEnabled();
};

export const isDebugEnabled = () => {
  if (import.meta.env.MODE !== 'production') return true;
  if (!betaDebugBuildEnabled()) return false;
  if (typeof window === 'undefined') return false;
  return !!(window as any).__RTV_DEBUG__;
};
