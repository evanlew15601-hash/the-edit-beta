/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_ENABLE_BETA_DEBUG?: string;
  readonly VITE_ENABLE_CLOUD_AI?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}
