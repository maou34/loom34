/// <reference deno.ns="true" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  email: string;
  password: string;
  username: string;
  full_name: string;
  is_admin?: boolean;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

function getBearerToken(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // 1) Auth: vérifier l'appelant via le JWT Bearer
    const token = getBearerToken(req);
    if (!token) return json({ error: "Unauthorized (missing bearer token)" }, 401);

    const { data: caller, error: callerErr } = await adminClient.auth.getUser(token);
    if (callerErr || !caller?.user) return json({ error: "Unauthorized" }, 401);

    // 2) Autorisation: l'appelant doit être admin (dans profiles)
    const { data: callerProfile, error: profErr } = await adminClient
      .from("profiles")
      .select("is_admin")
      .eq("id", caller.user.id)
      .maybeSingle();

    if (profErr) return json({ error: profErr.message }, 500);
    if (!callerProfile?.is_admin) return json({ error: "Forbidden" }, 403);

    // 3) Payload
    const body = (await req.json()) as Body;

    if (!body.email || !body.password || !body.username || !body.full_name) {
      return json({ error: "Missing required fields" }, 400);
    }

    // 4) Création du user auth
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        username: body.username,
        full_name: body.full_name,
      },
    });

    if (createErr) return json({ error: createErr.message }, 400);
    if (!created.user) return json({ error: "User not created" }, 500);

    // 5) is_admin (optionnel) appliqué côté DB
    if (body.is_admin) {
      const { error: upErr } = await adminClient
        .from("profiles")
        .update({ is_admin: true, updated_at: new Date().toISOString() })
        .eq("id", created.user.id);

      if (upErr) return json({ error: upErr.message }, 400);
    }

    return json({ userId: created.user.id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});