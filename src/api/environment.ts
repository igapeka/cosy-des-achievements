const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";

export const supabaseUrl = configuredUrl.replace(/\/$/, "");
export const mockMode = import.meta.env.DEV && import.meta.env.VITE_MOCK_MODE === "true";
