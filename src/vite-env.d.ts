/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_MOCK_MODE?: string;
  readonly VITE_SUPABASE_URL?: string;
}
