import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";

function getSafeLoginMessage(message: string) {
  if (
    message.includes("Invalid login credentials") ||
    message.includes("invalid_grant")
  ) {
    return "Email atau password yang Anda masukkan salah.";
  }

  if (message.includes("Email not confirmed")) {
    return "Email Anda belum dikonfirmasi. Silakan periksa inbox email Anda.";
  }

  return "Terjadi kesalahan saat masuk ke sistem.";
}

export async function POST(request: NextRequest) {
  let payload: { email?: unknown; password?: unknown };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Data login tidak valid." },
      { status: 400 },
    );
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { success: false, message: "Email dan kata sandi wajib diisi." },
      { status: 400 },
    );
  }

  if (!process.env.VITEST) {
    try {
      const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const allowed = await enforceRateLimit(
        `login:${email.toLowerCase()}:${clientIp}`,
        10,
        60 * 15
      );
      if (!allowed) {
        return NextResponse.json(
          {
            success: false,
            message: "Terlalu banyak percobaan login gagal. Harap tunggu beberapa saat sebelum mencoba kembali.",
          },
          { status: 429 },
        );
      }
    } catch {
      // Fall through if rate limiting storage is temporarily unavailable
    }
  }

  const response = NextResponse.json({ success: true });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set({ name, value, ...options });
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return NextResponse.json(
      {
        success: false,
        message: getSafeLoginMessage(error?.message || "Login gagal."),
      },
      { status: 401 },
    );
  }

  return response;
}
