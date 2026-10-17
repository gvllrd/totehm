/** Quiet, entirely synthesised sound for the temple and its parallel spaces.
 * No context, oscillator or sound is created before unlock() is called by a
 * genuine pointer/keyboard gesture. The caller owns the sound preference and
 * passes active:false for a hidden page, the list view or a stopped renderer.
 */
export function createGalleryAudio() {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  let supported = typeof AudioContextClass === 'function';
  let context = null, master = null, limiter = null, noiseBuffer = null;
  let unlocked = false, muted = false, active = false, disposed = false;
  let zone = 'temple', proximity = 0, transitions = 0;
  let suspendTimer = null, suspendPromise = null, resumePromise = null, resumeBlocked = false;
  const tones = [], breaths = new Set();

  const audible = () => unlocked && active && !muted && !disposed;
  const hold = (parameter, time) => {
    if (typeof parameter.cancelAndHoldAtTime === 'function') parameter.cancelAndHoldAtTime(time);
    else {
      const value = parameter.value;
      parameter.cancelScheduledValues(time);
      parameter.setValueAtTime(value, time);
    }
  };
  function glide(parameter, value, seconds = .12) {
    if (!context || context.state === 'closed') return;
    const time = context.currentTime;
    hold(parameter, time);
    parameter.setTargetAtTime(value, time, seconds);
  }
  function stopBreaths() {
    if (!context || context.state === 'closed') return;
    const time = context.currentTime;
    for (const breath of breaths) {
      hold(breath.gain.gain, time);
      breath.gain.gain.linearRampToValueAtTime(0, time + .04);
      try { breath.source.stop(time + .05); } catch { /* already ended */ }
    }
  }
  function mix() {
    if (!context || context.state === 'closed') return;
    const on = audible();
    // The two low tones become audible only near an arch. Their independent
    // sine waves stay deliberately quiet, without harmonics or a heavy bass hit.
    const pull = on && zone === 'temple' ? proximity ** 1.7 : 0;
    glide(master.gain, on ? .72 : 0, on ? .09 : .025);
    glide(tones[0].gain.gain, .018 * pull);
    glide(tones[1].gain.gain, .008 * pull);
    glide(tones[2].gain.gain, on && zone === 'void' ? .012 : 0, .2);
  }
  function cancelSuspension() {
    if (suspendTimer !== null) globalThis.clearTimeout(suspendTimer);
    suspendTimer = null;
  }
  async function resume() {
    if (!context || context.state === 'closed' || disposed || resumeBlocked) return false;
    if (suspendPromise) {
      await suspendPromise;
      if (!context || context.state === 'closed' || disposed || resumeBlocked) return false;
    }
    if (context.state === 'running') return true;
    if (resumePromise) return resumePromise;
    // Call resume synchronously inside unlock's gesture whenever no suspension
    // is pending; this also accommodates mobile browsers' activation rules.
    let operation;
    try { operation = context.resume(); } catch { resumeBlocked = true; return false; }
    resumePromise = Promise.resolve(operation).then(() => {
      return context.state === 'running';
    }).catch(() => {
      // A browser can require a fresh gesture after a system interruption.
      // update() never retries this in an animation-frame loop; unlock() can.
      resumeBlocked = true;
      return false;
    }).finally(() => { resumePromise = null; });
    return resumePromise;
  }
  function synchronise() {
    if (!context || disposed || context.state === 'closed') return;
    cancelSuspension();
    mix();
    if (audible()) {
      void resume();
    } else {
      stopBreaths();
      // Finish the short gain ramp before suspending the actual audio clock.
      suspendTimer = globalThis.setTimeout(() => {
        suspendTimer = null;
        if (!audible() && context?.state === 'running') {
          try {
            suspendPromise = Promise.resolve(context.suspend()).catch(() => {}).finally(() => { suspendPromise = null; });
          } catch { /* a system interruption may already have suspended it */ }
        }
      }, 120);
    }
  }
  function initialise() {
    context = new AudioContextClass({ latencyHint: 'interactive' });
    master = context.createGain();
    master.gain.value = 0;
    limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -24;
    limiter.knee.value = 18;
    limiter.ratio.value = 10;
    limiter.attack.value = .006;
    limiter.release.value = .25;
    limiter.connect(master);
    master.connect(context.destination);
    for (const frequency of [50, 70, 110]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.value = 0;
      oscillator.connect(gain);
      gain.connect(limiter);
      oscillator.start();
      tones.push({ oscillator, gain });
    }
    // One reusable, deterministic noise buffer; filtering and its envelope
    // provide the breath. Nothing is downloaded, decoded or recorded.
    noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * .9), context.sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    let seed = 0x746f7465;
    for (let i = 0; i < samples.length; i++) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      samples[i] = (seed >>> 0) / 2147483648 - 1;
    }
  }
  async function unlock() {
    if (disposed || !supported) return false;
    try {
      if (!context) initialise();
      resumeBlocked = false;
      const running = await resume();
      if (!running) return false;
      unlocked = true;
      synchronise();
      return true;
    } catch {
      // Audio is optional: unsupported devices retain the complete visit.
      supported = false;
      if (context && context.state !== 'closed') Promise.resolve(context.close()).catch(() => {});
      return false;
    }
  }
  function setMuted(value) {
    const next = Boolean(value);
    if (next === muted || disposed) return;
    muted = next;
    synchronise();
  }
  function update(state = {}) {
    if (disposed) return;
    const nextZone = state.zone === 'void' ? 'void' : state.zone === 'temple' ? 'temple' : zone;
    const nextProximity = Number.isFinite(state.proximity) ? Math.max(0, Math.min(1, state.proximity)) : proximity;
    const nextActive = typeof state.active === 'boolean' ? state.active : active;
    const changed = nextZone !== zone || Math.abs(nextProximity - proximity) > .002;
    const activityChanged = nextActive !== active;
    zone = nextZone;
    proximity = nextProximity;
    active = nextActive;
    if (activityChanged) synchronise();
    else if (changed) mix();
  }
  function transition(direction = 'enter') {
    if (!audible() || !context || context.state !== 'running') return;
    transitions++;
    stopBreaths();
    const time = context.currentTime, returning = direction === 'return';
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = 'lowpass';
    filter.Q.value = .5;
    filter.frequency.setValueAtTime(returning ? 95 : 185, time);
    filter.frequency.exponentialRampToValueAtTime(returning ? 260 : 65, time + .8);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(returning ? .025 : .05, time + .22);
    gain.gain.exponentialRampToValueAtTime(.00001, time + .8);
    gain.gain.linearRampToValueAtTime(0, time + .86);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(limiter);
    const breath = { source, filter, gain };
    breaths.add(breath);
    source.onended = () => {
      breaths.delete(breath);
      source.disconnect(); filter.disconnect(); gain.disconnect();
    };
    source.start(time);
    source.stop(time + .88);
  }
  function diagnostics() {
    return {
      supported, unlocked, muted,
      state: disposed ? 'closed' : context?.state || (supported ? 'uninitialized' : 'unsupported'),
      zone, proximity, voices: disposed ? 0 : tones.length + breaths.size,
      transitions, externalFiles: 0, active: !disposed && active,
    };
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    active = false;
    cancelSuspension();
    for (const breath of breaths) {
      breath.source.onended = null;
      try { breath.source.stop(); } catch { /* already ended */ }
      breath.source.disconnect(); breath.filter.disconnect(); breath.gain.disconnect();
    }
    breaths.clear();
    for (const tone of tones) {
      try { tone.oscillator.stop(); } catch { /* already stopped */ }
      tone.oscillator.disconnect(); tone.gain.disconnect();
    }
    tones.length = 0;
    master?.disconnect(); limiter?.disconnect(); noiseBuffer = null;
    if (context && context.state !== 'closed') Promise.resolve(context.close()).catch(() => {});
  }
  return { unlock, setMuted, update, transition, diagnostics, dispose };
}
