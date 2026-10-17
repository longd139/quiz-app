// Text-to-speech utility using Web Speech API

export const TTS_AUTO_MUTE_STORAGE_KEY = 'app_tts_auto_muted';

export function isTtsAutoMuted() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(TTS_AUTO_MUTE_STORAGE_KEY) === 'true';
}

export function setTtsAutoMuted(muted) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TTS_AUTO_MUTE_STORAGE_KEY, muted ? 'true' : 'false');
  if (muted && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // ignore
    }
  }
}

// Backwards compatibility aliases
export const isTtsMuted = isTtsAutoMuted;
export const setTtsMuted = setTtsAutoMuted;

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // ignore
    }
  }
}

// Manual speak - ALWAYS plays when clicked
export function speakWord(text, lang = 'en-US') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  try {
    window.speechSynthesis.cancel(); // Stop any currently speaking voice
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.88; // Slightly slower for clear pronunciation learning
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (e) {
    console.error('Speech synthesis error:', e);
    return false;
  }
}

// Automatic speak when switching questions/cards - respect auto-mute toggle
export function speakWordAuto(text, lang = 'en-US') {
  if (isTtsAutoMuted()) {
    return false;
  }
  return speakWord(text, lang);
}


