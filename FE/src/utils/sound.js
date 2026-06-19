let audioCtx = null;
let activeUtterances = [];

const getAudioContext = () => {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  return audioCtx;
};

// Automatically try to unlock AudioContext on first user click/touch
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          console.log('AudioContext unlocked successfully.');
          cleanup();
        }).catch((err) => {
          console.warn('Failed to resume AudioContext:', err);
        });
      } else {
        cleanup();
      }
    }
  };

  const cleanup = () => {
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  };

  document.addEventListener('click', unlockAudio);
  document.addEventListener('touchstart', unlockAudio);
}

export const playNotificationSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const now = ctx.currentTime;
    
    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.1, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);
    
    // Tone 2: A5 (880.00 Hz) with 120ms offset
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12);
    gain2.gain.setValueAtTime(0.12, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.52);
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
};

export const speakNotification = (text) => {
  try {
    if (!window.speechSynthesis) return;
    
    // Cancel any current queued utterances to make it instant
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    
    // Store in global array to prevent garbage collection bug in Chrome
    activeUtterances.push(utterance);
    utterance.onend = () => {
      activeUtterances = activeUtterances.filter(u => u !== utterance);
    };
    utterance.onerror = () => {
      activeUtterances = activeUtterances.filter(u => u !== utterance);
    };
    
    // Try to find a Vietnamese voice
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.toLowerCase().includes('vi'));
    if (viVoice) {
      utterance.voice = viVoice;
    }
    
    utterance.rate = 1.0; // Normal rate
    utterance.pitch = 1.0; // Normal pitch
    
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error('Failed to run SpeechSynthesis:', error);
  }
};
