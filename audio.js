// procedural synth-pop audio engine using web audio api
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.bgmInterval = null;
        this.bgmNodes = [];
        this.bpm = 85; // Slow, emotional Bollywood tempo for Saiyara
        this.currentStep = 0;
        this.muted = false;
        this.mainVolume = null;
        this.musicVolume = null;
        this.sfxVolume = null;

        // Custom local MP3 support
        this.useCustomBGM = false;
        this.audioElement = null;
        this.customBgmSource = null;

        // volume percentages (saved/default)
        this.musicVolPercent = 80;
        this.sfxVolPercent = 80;

        // Chords matching the Saiyara theme (Am, F, C, E)
        this.chords = [
            [220.00, 261.63, 329.63], // Am (A3, C4, E4)
            [174.61, 220.00, 261.63], // F (F3, A3, C4)
            [130.81, 164.81, 196.00], // C (C3, E3, G3)
            [164.81, 207.65, 246.94]  // E (E3, G#3, B3)
        ];
        this.bassNotes = [55.00, 43.65, 65.41, 41.20]; // A1, F1, C2, E1
    }

    init() {
        if (this.ctx) return;
        
        // create audio context
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        this.ctx = new AudioContextClass();
        
        // main volume nodes
        this.mainVolume = this.ctx.createGain();
        this.mainVolume.gain.setValueAtTime(0.8, this.ctx.currentTime);
        this.mainVolume.connect(this.ctx.destination);

        this.musicVolume = this.ctx.createGain();
        this.musicVolume.connect(this.mainVolume);
        this.updateMusicVolumeNode();

        this.sfxVolume = this.ctx.createGain();
        this.sfxVolume.connect(this.mainVolume);
        this.updateSfxVolumeNode();

        // Connect HTML5 custom BGM player node
        this.audioElement = document.getElementById('custom-bgm-player');
        if (this.audioElement && !this.customBgmSource) {
            this.customBgmSource = this.ctx.createMediaElementSource(this.audioElement);
            this.customBgmSource.connect(this.musicVolume);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMusicVolume(volPercent) {
        this.musicVolPercent = volPercent;
        this.init();
        this.updateMusicVolumeNode();
    }

    setSfxVolume(volPercent) {
        this.sfxVolPercent = volPercent;
        this.init();
        this.updateSfxVolumeNode();
    }

    updateMusicVolumeNode() {
        if (this.musicVolume && this.ctx) {
            const val = (this.musicVolPercent / 100) * 0.55; // Increased Music max gain cap (louder)
            this.musicVolume.gain.setValueAtTime(val, this.ctx.currentTime);
        }
    }

    updateSfxVolumeNode() {
        if (this.sfxVolume && this.ctx) {
            const val = (this.sfxVolPercent / 100) * 0.35; // SFX max gain cap
            this.sfxVolume.gain.setValueAtTime(val, this.ctx.currentTime);
        }
    }

    // synthesize custom noise buffer for slide and crash sounds
    createNoiseBuffer() {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    playJump() {
        this.init();
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxVolume);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    playSneakerJump() {
        this.init();
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.24);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(205, now);
        osc2.frequency.exponentialRampToValueAtTime(1105, now + 0.24);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxVolume);

        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.3);
        osc2.stop(now + 0.3);
    }

    playSlide() {
        this.init();
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer();

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.25);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxVolume);

        noise.start(now);
        noise.stop(now + 0.4);
    }

    playCoin() {
        this.init();
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        
        const chime = (freq, delay, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + delay);
            
            gain.gain.setValueAtTime(0.15, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
            
            osc.connect(gain);
            gain.connect(this.sfxVolume);
            
            osc.start(now + delay);
            osc.stop(now + delay + duration + 0.05);
        };

        chime(987.77, 0, 0.1);    // B5
        chime(1318.51, 0.06, 0.18); // E6
    }

    playHoverboard() {
        this.init();
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(350, now + 0.4);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(104, now);
        osc2.frequency.linearRampToValueAtTime(354, now + 0.4);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxVolume);

        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.5);
        osc2.stop(now + 0.5);
    }

    playPowerup() {
        this.init();
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C major
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const delay = idx * 0.05;
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + delay);
            
            gain.gain.setValueAtTime(0.25, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.15);
            
            osc.connect(gain);
            gain.connect(this.sfxVolume);
            
            osc.start(now + delay);
            osc.stop(now + delay + 0.2);
        });
    }

    playPrizeReveal() {
        this.init();
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const delay = idx * 0.08;
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + delay);
            
            gain.gain.setValueAtTime(0.22, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25);
            
            osc.connect(gain);
            gain.connect(this.sfxVolume);
            
            osc.start(now + delay);
            osc.stop(now + delay + 0.3);
        });
    }

    playCrash() {
        this.init();
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer();

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(300, now);
        noiseFilter.frequency.linearRampToValueAtTime(20, now + 0.8);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.85);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxVolume);

        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.3);
        
        oscGain.gain.setValueAtTime(0.4, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(oscGain);
        oscGain.connect(this.sfxVolume);

        noise.start(now);
        osc.start(now);
        
        noise.stop(now + 0.9);
        osc.stop(now + 0.45);
    }

    startBGM() {
        this.init();
        this.resume();
        if (this.muted || !this.ctx) return;

        if (this.useCustomBGM && this.audioElement) {
            this.audioElement.play().catch(e => console.log('Autoplay blocked', e));
            return;
        }

        if (this.bgmInterval) return; // already playing

        const stepTime = 60 / this.bpm / 2; // eighth notes (0.25 seconds per step)
        this.currentStep = 0;

        const scheduler = () => {
            const nextNoteTime = this.ctx.currentTime + 0.05;
            this.playBGMStep(this.currentStep, nextNoteTime);
            
            this.currentStep = (this.currentStep + 1) % 32;
        };

        this.bgmInterval = setInterval(scheduler, stepTime * 1000);
    }

    stopBGM() {
        if (this.useCustomBGM && this.audioElement) {
            this.audioElement.pause();
            return;
        }

        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
        this.bgmNodes.forEach(node => {
            try { node.stop(); } catch(e) {}
        });
        this.bgmNodes = [];
    }

    playBGMStep(step, time) {
        if (!this.ctx || this.muted) return;

        const stepTime = 60 / this.bpm / 2; // Duration of one step in seconds (0.25s)
        
        const chordIdx = Math.floor(step / 8) % 4;
        const bassNote = this.bassNotes[chordIdx];
        const subStep = step % 8;

        // 1. Bass Line (played on steps 0, 2, 4, 6)
        if (subStep === 0 || subStep === 2 || subStep === 4 || subStep === 6) {
            const bassOsc = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            
            bassOsc.type = 'sawtooth';
            bassOsc.frequency.setValueAtTime(bassNote, time);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, time); // soft lowpass

            bassGain.gain.setValueAtTime(0.12, time);
            bassGain.gain.exponentialRampToValueAtTime(0.01, time + 0.35);

            bassOsc.connect(filter);
            filter.connect(bassGain);
            bassGain.connect(this.musicVolume);

            bassOsc.start(time);
            bassOsc.stop(time + 0.4);
            this.bgmNodes.push(bassOsc);
        }

        // 2. Chords Arpeggio backing (quiet synth arp)
        const currentChord = this.chords[chordIdx];
        const arpeggioPattern = [0, 1, 2, 1, 0, 2, 1, 2];
        const noteIndex = arpeggioPattern[subStep];
        let backingFreq = currentChord[noteIndex];

        const arpeggOsc = this.ctx.createOscillator();
        const arpeggGain = this.ctx.createGain();

        arpeggOsc.type = 'triangle';
        arpeggOsc.frequency.setValueAtTime(backingFreq, time);

        arpeggGain.gain.setValueAtTime(0.04, time); // low volume backing
        arpeggGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

        arpeggOsc.connect(arpeggGain);
        arpeggGain.connect(this.musicVolume);

        arpeggOsc.start(time);
        arpeggOsc.stop(time + 0.22);
        this.bgmNodes.push(arpeggOsc);

        // 3. Saiyara Hook Melody Line
        // 32-step sequence representing the "Saiyara ve saiyara..." hook melody line in A Minor
        const saiyaraMelody = [
            // Bar 1: "Sai-ya-ra" (E5, F5, E5, D5, C5)
            { freq: 659.25, dur: 2 }, null, { freq: 698.46, dur: 1 }, { freq: 659.25, dur: 1 }, { freq: 587.33, dur: 2 }, null, { freq: 523.25, dur: 2 }, null,
            // Bar 2: "ve sai-ya-ra" (D5, E5, D5, C5, B4)
            { freq: 587.33, dur: 2 }, null, { freq: 659.25, dur: 1 }, { freq: 587.33, dur: 1 }, { freq: 523.25, dur: 2 }, null, { freq: 493.88, dur: 2 }, null,
            // Bar 3: "Sai-ya-ra" (C5, D5, C5, B4, A4)
            { freq: 523.25, dur: 2 }, null, { freq: 587.33, dur: 1 }, { freq: 523.25, dur: 1 }, { freq: 493.88, dur: 2 }, null, { freq: 440.00, dur: 2 }, null,
            // Bar 4: "ve sai-ya-ra" (B4, C5, B4, A4, G#4)
            { freq: 493.88, dur: 2 }, null, { freq: 523.25, dur: 1 }, { freq: 493.88, dur: 1 }, { freq: 440.00, dur: 2 }, null, { freq: 415.30, dur: 2 }, null
        ];

        const melodyEvent = saiyaraMelody[step];
        if (melodyEvent) {
            const melOsc = this.ctx.createOscillator();
            const melGain = this.ctx.createGain();

            // warm flute-like lead oscillator
            melOsc.type = 'sine';
            melOsc.frequency.setValueAtTime(melodyEvent.freq, time);

            const durationSec = melodyEvent.dur * stepTime;

            melGain.gain.setValueAtTime(0.14, time); // proud lead volume
            melGain.gain.linearRampToValueAtTime(0.09, time + durationSec * 0.25);
            melGain.gain.exponentialRampToValueAtTime(0.001, time + durationSec);

            melOsc.connect(melGain);
            melGain.connect(this.musicVolume);

            melOsc.start(time);
            melOsc.stop(time + durationSec + 0.05);
            this.bgmNodes.push(melOsc);
        }

        // Keep node array size limited
        if (this.bgmNodes.length > 80) {
            this.bgmNodes.splice(0, 30);
        }
    }
}

// export global instance
const gameAudio = new AudioEngine();
window.gameAudio = gameAudio;
