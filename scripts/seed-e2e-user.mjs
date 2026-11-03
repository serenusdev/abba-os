import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

if (!url || !serviceRoleKey || !email || !password) {
  throw new Error("E2E seed requires Supabase URL, service role key, email, and password.");
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (createError || !created.user) throw createError || new Error("E2E user was not created.");

const userId = created.user.id;
const { error: profileError } = await admin.from("profiles").upsert({
  id: userId,
  email,
  full_name: "E2E Active User",
  status: "active",
  member_type: "santri",
}, { onConflict: "id" });
if (profileError) throw profileError;

const { data: role, error: roleError } = await admin
  .from("roles")
  .select("id")
  .eq("key", "santri")
  .single();
if (roleError || !role) throw roleError || new Error("Santri role was not seeded.");

const { error: grantError } = await admin.from("user_roles").insert({
  user_id: userId,
  role_id: role.id,
});
if (grantError) throw grantError;

console.log("E2E user seeded");
