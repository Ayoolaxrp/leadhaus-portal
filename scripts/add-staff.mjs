// Adds a Leadhaus team member to the live (Supabase) workspace.
//
//   node --env-file=.env.local scripts/add-staff.mjs dare@leadhausstudios.com "Dare" "Founder"
//   add --no-email to create the account without sending an invite (they sign in
//   later with "Email me a sign-in link"). Once the portal is live, staff can
//   also be added from Admin > Team > Add a team member.
//
// Sends a Supabase invite (or reuses an existing account), promotes the profile
// to admin, and lists the person in the workspace so they can be an account lead.
// Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SITE_URL.
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const noEmail = args.includes("--no-email");
const [email, name, title = "Team"] = args.filter((a) => a !== "--no-email");
if (!email || !name) {
  console.error('Usage: node --env-file=.env.local scripts/add-staff.mjs <email> "<name>" ["<title>"]');
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const address = email.trim().toLowerCase();

const fail = (step, error) => {
  console.error(`${step}: ${error.message}`);
  process.exit(1);
};

let { data: profile } = await supabase.from("profiles").select("id").eq("email", address).maybeSingle();
if (!profile) {
  const { data, error } = noEmail
    ? await supabase.auth.admin.createUser({ email: address, email_confirm: true, user_metadata: { full_name: name } })
    : await supabase.auth.admin.inviteUserByEmail(address, { data: { full_name: name }, redirectTo: `${site}/auth/callback?next=/` });
  if (error) fail(noEmail ? "Create account" : "Invite", error);
  profile = { id: data.user.id };
  console.log(noEmail ? `Account created for ${address} (no email sent).` : `Invite sent to ${address}.`);
} else {
  console.log(`${address} already has an account; promoting it.`);
}

const { error: roleError } = await supabase.from("profiles").update({ role: "admin", client_id: null, full_name: name, title }).eq("id", profile.id);
if (roleError) fail("Promote profile", roleError);

const { data: row, error: readError } = await supabase.from("leadhaus_app_state").select("revision,state").eq("id", true).single();
if (readError) fail("Read workspace", readError);
const state = row.state;
state.users = state.users.filter((u) => u.id !== profile.id && u.email !== address);
state.users.push({ id: profile.id, name, email: address, role: "admin", title });
const { data: saved, error: saveError } = await supabase
  .from("leadhaus_app_state")
  .update({ state, revision: Number(row.revision) + 1, updated_at: new Date().toISOString() })
  .eq("id", true)
  .eq("revision", row.revision)
  .select("revision")
  .maybeSingle();
if (saveError) fail("Save workspace", saveError);
if (!saved) fail("Save workspace", new Error("someone saved at the same time; run the command again"));
console.log(`${name} is now Leadhaus staff.`);
