export const betaDebugBuildEnabled = () => {
  return import.meta.env.VITE_ENABLE_BETA_DEBUG === '1';
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
