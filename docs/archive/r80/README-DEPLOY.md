# R8 Deployment (Vercel)

1. Create a new Vercel project and connect this repository folder.
2. Framework Preset: Vite
3. Build Command: `yarn build`
4. Output Directory: `dist`
5. Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Optional: set `VITE_DEBUG_MODE` to `true` for initial debugging.
7. SPA routing: vercel.json is included to rewrite all routes to `/`.