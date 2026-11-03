const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

if (!url || !serviceRoleKey || !email || !password) {
  throw new Error("E2E seed requires Supabase URL, service role key, email, and password.");
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
};

async function request(path, options = {}) {
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const body = await response.text();
  const parsed = body ? JSON.parse(body) : null;
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed (${response.status}): ${body}`);
  }
  return parsed;
}

const created = await request("/auth/v1/admin/users", {
  method: "POST",
  body: JSON.stringify({
  email,
  password,
  email_confirm: true,
  }),
});
if (!created?.id) throw new Error("E2E user was not created.");

const userId = created.id;
await request("/rest/v1/profiles", {
  method: "POST",
  headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
  body: JSON.stringify([{
    id: userId,
    email,
    full_name: "E2E Active User",
    status: "active",
    member_type: "santri",
  }]),
});

const roles = await request("/rest/v1/roles?key=eq.santri&select=id");
const role = roles?.[0];
if (!role) throw new Error("Santri role was not seeded.");

await request("/rest/v1/user_roles", {
  method: "POST",
  headers: { Prefer: "return=minimal" },
  body: JSON.stringify([{
    user_id: userId,
    role_id: role.id,
  }]),
});

console.log("E2E user seeded");
