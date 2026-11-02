# IDAROH PWA

IDAROH is online-first. The service worker caches the application shell and
brand assets, then prefers the network for current authenticated data. It does
not cache Supabase responses, credentials, or private pages, so offline mode is
limited to the shell and a safe fallback page.
