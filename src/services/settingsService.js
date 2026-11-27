import { supabase } from '../lib/supabase';

const DEFAULT_PREFS = {
  shuffleQuestions: true,
  shuffleOptions: false,
  practiceMode: 'submit',
};

export async function fetchUserPreferences(userId) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return { ...DEFAULT_PREFS };

  return {
    shuffleQuestions: data.shuffle_questions,
    shuffleOptions: data.shuffle_options,
    practiceMode: data.practice_mode,
    ttsMuted: data.tts_muted,
    fontSize: data.font_size,
    darkMode: data.dark_mode,
  };
}

export async function saveUserPreferences(userId, settings) {
  const { error } = await supabase.from('user_preferences').upsert({
    user_id: userId,
    shuffle_questions: settings.shuffleQuestions ?? true,
    shuffle_options: settings.shuffleOptions ?? false,
    practice_mode: settings.practiceMode === 'instant' ? 'instant' : 'submit',
    tts_muted: Boolean(settings.ttsMuted),
    font_size: Number(settings.fontSize) || 100,
    dark_mode: Boolean(settings.darkMode),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function fetchSystemSettings() {
  const { data, error } = await supabase.from('system_settings').select('*');
  if (error) throw new Error(error.message);
  const result = {};
  for (const row of data || []) {
    result[row.key] = row.value;
  }
  return result;
}

export async function saveSystemSetting(key, value, adminUserId) {
  const { error } = await supabase.from('system_settings').upsert({
    key,
    value,
    updated_by: adminUserId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}
