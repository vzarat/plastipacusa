import { createServerClient } from "@/lib/supabase/server";
import { createConversation, loadLatestConversation } from "@/lib/assistant/persist";

export const runtime = "nodejs";

async function requireUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { supabase, userId: null as string | null };
  return { supabase, userId: user.id };
}

export async function GET() {
  const { supabase, userId } = await requireUser();
  if (!userId) {
    return Response.json({ error: "Sign in to use Assist AI." }, { status: 401 });
  }
  const history = await loadLatestConversation(supabase, userId);
  return Response.json(history);
}

export async function POST() {
  const { supabase, userId } = await requireUser();
  if (!userId) {
    return Response.json({ error: "Sign in to use Assist AI." }, { status: 401 });
  }
  const conversationId = await createConversation(supabase, userId);
  if (!conversationId) {
    return Response.json({ error: "Assist AI could not start a new conversation." }, { status: 503 });
  }
  return Response.json({ conversationId, messages: [] });
}
