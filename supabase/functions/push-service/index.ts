import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const expoPushUrl = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_TIMEOUT_MS = 10000;

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: any;
  schema: "public";
  old_record: any | null;
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload | {
      type: "LOGIN_APPROVAL";
      userId: string;
      requestingDeviceName: string;
    } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Setup Supabase admin client to bypass RLS and fetch tokens
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    let messages: any[] = [];

    if (payload.type === "LOGIN_APPROVAL") {
      const authorization = req.headers.get("Authorization");
      if (!authorization) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      });

      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || user?.id !== payload.userId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("expo_push_token")
        .eq("id", payload.userId)
        .single();

      if (profile?.expo_push_token) {
        messages.push({
          to: profile.expo_push_token,
          sound: "default",
          title: "Giris Onayi Gerekli",
          body: `${payload.requestingDeviceName} cihazi hesabiniza girmek istiyor.`,
          data: { type: "login_request" },
        });
      }
    }

    // 1. Yeni Mesaj (messages tablosu)
    if ("table" in payload && payload.table === "messages" && payload.type === "INSERT") {
      const msg = payload.record;
      
      // Gönderen bilgisini al
      const { data: sender } = await supabaseAdmin
        .from("profiles")
        .select("ad_soyad")
        .eq("id", msg.sender_id)
        .single();
        
      // Alıcı bilgisini (conversation'dan) al
      const { data: conv } = await supabaseAdmin
        .from("conversations")
        .select("buyer_id, seller_id")
        .eq("id", msg.conversation_id)
        .single();
        
      if (!conv) {
        return new Response("Conversation not found", { status: 400 });
      }
      
      const receiverId = conv.buyer_id === msg.sender_id ? conv.seller_id : conv.buyer_id;
      
      const { data: receiver } = await supabaseAdmin
        .from("profiles")
        .select("expo_push_token")
        .eq("id", receiverId)
        .single();
        
      if (receiver?.expo_push_token) {
        messages.push({
          to: receiver.expo_push_token,
          sound: "default",
          title: `Yeni Mesaj: ${sender?.ad_soyad || "Kullanıcı"}`,
          body: msg.content,
          data: { url: `/messages` } // Mesaj listesine yönlendir
        });
      }
    }
    
    // 2. Fırsat Havuzu (cars tablosu)
    if ("table" in payload && payload.table === "cars" && payload.type === "INSERT" && payload.record.is_opportunity) {
      const car = payload.record;
      
      // Sadece onaylı galerilerin tokenlarını al
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("expo_push_token")
        .eq("status", "approved")
        .not("expo_push_token", "is", null);
        
      if (profiles && profiles.length > 0) {
        messages = profiles.map((p: any) => ({
          to: p.expo_push_token,
          sound: "default",
          title: "🔥 Yeni Fırsat Aracı!",
          body: `${car.brand} ${car.model} fırsat havuzuna eklendi. Hemen inceleyin!`,
          data: { url: `/listing/${car.id}` }
        }));
      }
    }
    
    // 3. Hesap Onayı (profiles tablosu)
    if ("table" in payload && payload.table === "profiles" && payload.type === "UPDATE") {
      const newProfile = payload.record;
      const oldProfile = payload.old_record;
      
      if (newProfile.status === "approved" && oldProfile?.status !== "approved" && newProfile.expo_push_token) {
        messages.push({
          to: newProfile.expo_push_token,
          sound: "default",
          title: "Hesabınız Onaylandı! ✅",
          body: "Galerilink hesabınız onaylandı. Şimdi ilan verebilir ve fırsat havuzuna erişebilirsiniz.",
          data: { url: `/(tabs)` }
        });
      }
    }
    
    // Eğer gönderilecek mesaj varsa Expo API'sini çağır
    if (messages.length > 0) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), EXPO_PUSH_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(expoPushUrl, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messages),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      
      if (!res.ok) {
        console.warn("Expo push request failed:", res.status);
      }
    } else {
      console.info("No messages to send.");
    }
    
    return new Response(JSON.stringify({ success: true, sent_count: messages.length }), {
      headers: { "Content-Type": "application/json" },
    });
    
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "Request timeout"
      : "Function error";
    console.error(message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
