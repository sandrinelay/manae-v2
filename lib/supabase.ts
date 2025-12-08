// Re-export the browser client for backward compatibility
// For new code, use:
// - import { createClient } from '@/lib/supabase/client' for client components
// - import { createClient } from '@/lib/supabase/server' for server components
import { createClient } from '@/lib/supabase/client'

export const supabase = createClient()