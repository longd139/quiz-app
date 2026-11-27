/* global process, console */
/**
 * Safe Admin Bootstrap Script (Server-Side Only)
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   BOOTSTRAP_ADMIN_EMAIL=admin@example.com \
 *   BOOTSTRAP_ADMIN_PASSWORD=StrongTempPassword123! \
 *   BOOTSTRAP_ADMIN_NAME="Quản trị viên" \
 *   node scripts/bootstrap-admin.mjs
 *
 * - Never hardcodes credentials.
 * - Safe to re-run (idempotent): if user exists, ensures ADMIN role & ACTIVE status.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
const fullName = (process.env.BOOTSTRAP_ADMIN_NAME || 'Quản trị viên').trim();

if (!url || !serviceRoleKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
  process.exit(1);
}

if (!email || !password || password.length < 8) {
  console.error('Error: BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (min 8 chars) are required.');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function bootstrapAdmin() {
  const { data: existingProfile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, role, status')
    .eq('email', email)
    .maybeSingle();

  if (profileErr) {
    throw new Error(`Failed to query profiles: ${profileErr.message}`);
  }

  let userId = existingProfile?.id;

  if (!userId) {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createErr) {
      throw new Error(`Failed to create auth user: ${createErr.message}`);
    }
    userId = created.user.id;
    console.log(`Created auth user for ${email} (${userId})`);
  } else {
    console.log(`User ${email} already exists (${userId}); ensuring ADMIN role.`);
  }

  const { error: upsertErr } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email,
      full_name: fullName,
      role: 'ADMIN',
      status: 'ACTIVE',
      must_change_password: false,
    });

  if (upsertErr) {
    throw new Error(`Failed to upsert admin profile: ${upsertErr.message}`);
  }

  await supabase.from('audit_logs').insert({
    actor_user_id: userId,
    action: 'ADMIN_BOOTSTRAP',
    entity_type: 'profile',
    entity_id: userId,
    metadata: { email },
  });

  console.log('Admin bootstrap completed successfully.');
}

bootstrapAdmin().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
