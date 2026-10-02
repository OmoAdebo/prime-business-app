import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Prime runs on its own Supabase project. The platform regenerates `.env`
// with its managed backend values, so the real backend is pinned here and
// overrides whatever `.env` contains. The publishable (anon) key is safe to
// ship in client code.
const PRIME_SUPABASE_PROJECT_ID = "zoukfdfpbmcyapkbujnr";
const PRIME_SUPABASE_URL = `https://${PRIME_SUPABASE_PROJECT_ID}.supabase.co`;
const PRIME_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvdWtmZGZwYm1jeWFwa2J1am5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NjQyMjMsImV4cCI6MjA4OTA0MDIyM30.TULtiyRNKxQQckM347mTwmt2oNDsiUpd70ydRDHmNeo";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(PRIME_SUPABASE_URL),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(PRIME_SUPABASE_PUBLISHABLE_KEY),
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(PRIME_SUPABASE_PROJECT_ID),
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
