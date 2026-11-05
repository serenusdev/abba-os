import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

export async function POST(request: Request) {
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

  const supabase = await createClient();
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

  return NextResponse.json({ success: true });
}

