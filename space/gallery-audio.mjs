/** Entirely synthesised wind, breaking sea and portal sound for the temple.
 * No context, oscillator or sound is created before unlock() is called by a
 * genuine pointer/keyboard gesture. The caller owns the sound preference and
 * passes active:false for a hidden page, the list view or a stopped renderer.
 */
export function createGalleryAudio() {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  let supported = typeof AudioContextClass === 'function';
  let context = null, master = null, limiter = null, noiseBuffer = null, weatherBus = null, windBus = null, seaBus = null;
  let unlocked = false, muted = false, active = false, disposed = false;
  let zone = 'temple', proximity = 0, exposure = 0, shelter = 0, transitions = 0;
  let suspendTimer = null, suspendPromise = null, resumePromise = null, resumeBlocked = false;
  const tones = [], breaths = new Set(), weather = [], modulators = [], weatherBuffers = [];
  const magneticGains = [0, 0];
  let weatherGain = 0;

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
    magneticGains[0] = .018 * pull;
    magneticGains[1] = .008 * pull;
    glide(tones[0].gain.gain, magneticGains[0]);
    glide(tones[1].gain.gain, magneticGains[1]);
    glide(tones[2].gain.gain, on && zone === 'void' ? .012 : 0, .2);
    // The weather recedes at a door so its magnetic note remains intelligible.
    // All four layers share one gate; muting never changes their running graph.
    // Glass shelters the listener. Outdoors remains unchanged; inside, wind
    // and distant breakers recede so individual pieces of burning wood can
    // be heard instead of disappearing beneath a continuous weather bed.
    weatherGain = on && zone === 'temple' ? (.66 - .15 * proximity) * (1 - .60 * shelter) : 0;
    if (weatherBus) {
      glide(weatherBus.gain, weatherGain, .35);
      glide(windBus.gain, (.72 + .5 * exposure) * (1 - .84 * shelter), .4);
      glide(seaBus.gain, (.94 - .12 * exposure) * (1 - .65 * shelter), .4);
    }
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
  function modulate(parameter, frequency, depth, phase = 0) {
    // Incommensurate periods and independent stereo noise avoid a recognisable
    // short loop. These clocks stop with the AudioContext, without a JS timer.
    const oscillator = context.createOscillator(), amount = context.createGain();
    oscillator.type = 'sine';
    if (phase) {
      const real = new Float32Array([0, Math.sin(phase)]);
      const imaginary = new Float32Array([0, Math.cos(phase)]);
      oscillator.setPeriodicWave(context.createPeriodicWave(real, imaginary));
    }
    oscillator.frequency.value = frequency;
    amount.gain.value = depth;
    oscillator.connect(amount); amount.connect(parameter); oscillator.start();
    modulators.push({ oscillator, amount });
  }
  function weatherNoise(seconds, pink) {
    const buffer = context.createBuffer(2, Math.ceil(context.sampleRate * seconds), context.sampleRate);
    let seed = pink ? 0x6d617265 : 0x76656e74;
    const random = () => {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      return (seed >>> 0) / 2147483648 - 1;
    };
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < data.length; i++) {
        const white = random();
        if (pink) {
          b0 = .99886 * b0 + white * .0555179;
          b1 = .99332 * b1 + white * .0750759;
          b2 = .969 * b2 + white * .153852;
          b3 = .8665 * b3 + white * .3104856;
          b4 = .55 * b4 + white * .5329522;
          b5 = -.7616 * b5 - white * .016898;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * .5362) * .11;
          b6 = white * .115926;
        } else data[i] = white;
      }
      // Blend a short wrap region. No discontinuity at the seam can become an
      // artificial knock once a long low-frequency surge passes the filters.
      const wrap = Math.min(Math.floor(context.sampleRate * .09), Math.floor(data.length / 2));
      for (let i = 0; i < wrap; i++) {
        const blend = (i + 1) / wrap;
        data[data.length - wrap + i] = data[data.length - wrap + i] * (1 - blend) + data[i] * blend;
      }
    }
    weatherBuffers.push(buffer); return buffer;
  }
  function weatherLayer(buffer, { kind, highpass, lowpass, gain, rate, pan, sway, surge, wash }) {
    const source = context.createBufferSource(), low = context.createBiquadFilter();
    const high = context.createBiquadFilter(), level = context.createGain();
    source.buffer = buffer; source.loop = true; source.loopStart = .09; source.playbackRate.value = rate;
    high.type = 'highpass'; high.frequency.value = highpass; high.Q.value = .45;
    low.type = 'lowpass'; low.frequency.value = lowpass; low.Q.value = .45;
    level.gain.value = gain;
    source.connect(high); high.connect(low); low.connect(level);
    let panner = null;
    if (typeof context.createStereoPanner === 'function') {
      panner = context.createStereoPanner(); panner.pan.value = pan;
      level.connect(panner); panner.connect(kind === 'wind' ? windBus : seaBus);
      modulate(panner.pan, .023 + sway * .009, .14, .8 + sway);
    } else level.connect(kind === 'wind' ? windBus : seaBus);
    modulate(level.gain, surge, gain * .43, 1.4 + sway);
    modulate(level.gain, wash, gain * .18, 3.1 + sway);
    modulate(low.frequency, wash * .71, lowpass * .26, .2 + sway);
    source.start(0, buffer.duration * ((sway * .37) % 1));
    weather.push({ kind, source, high, low, level, panner });
  }
  function initialiseWeather() {
    weatherBus = context.createGain(); weatherBus.gain.value = 0; weatherBus.connect(limiter);
    windBus = context.createGain(); seaBus = context.createGain();
    windBus.gain.value = .72; seaBus.gain.value = .94;
    windBus.connect(weatherBus); seaBus.connect(weatherBus);
    const pink = weatherNoise(17.31, true), white = weatherNoise(13.79, false);
    // Wind: low turbulent body and a much quieter moving ribbon of upper air.
    // Sea: a distant mass of water and the brighter wash of a breaking crest.
    // Broad, low-Q filters avoid synthetic whistles and piercing white noise.
    weatherLayer(pink, { kind: 'wind', highpass: 105, lowpass: 780, gain: .24, rate: .81, pan: -.28, sway: .2, surge: .079, wash: .137 });
    weatherLayer(white, { kind: 'wind', highpass: 820, lowpass: 3300, gain: .033, rate: .973, pan: .31, sway: .8, surge: .079, wash: .113 });
    weatherLayer(pink, { kind: 'sea', highpass: 29, lowpass: 205, gain: .38, rate: .693, pan: .12, sway: 1.3, surge: .061, wash: .097 });
    weatherLayer(white, { kind: 'sea', highpass: 390, lowpass: 2450, gain: .09, rate: 1.037, pan: -.16, sway: 1.8, surge: .061, wash: .097 });
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
    initialiseWeather();
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
    const nextExposure = Number.isFinite(state.exposure) ? Math.max(0, Math.min(1, state.exposure)) : exposure;
    const nextShelter = Number.isFinite(state.shelter) ? Math.max(0, Math.min(1, state.shelter)) : shelter;
    const changed = nextZone !== zone || Math.abs(nextProximity - proximity) > .002 || Math.abs(nextExposure - exposure) > .01 || Math.abs(nextShelter - shelter) > .002;
    const activityChanged = nextActive !== active;
    zone = nextZone;
    proximity = nextProximity;
    active = nextActive;
    exposure = nextExposure;
    shelter = nextShelter;
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
      zone, proximity, voices: disposed ? 0 : tones.length + weather.length + breaths.size,
      magneticGains: disposed ? [0, 0] : [...magneticGains],
      weather: {
        wind: weather.filter(layer => layer.kind === 'wind').length,
        sea: weather.filter(layer => layer.kind === 'sea').length,
        layers: weather.length, stereo: weather.length > 0,
        active: audible() && zone === 'temple', gain: disposed ? 0 : weatherGain,
        exposure, shelter, indoorAttenuation: 1 - .60 * shelter,
        windGain: disposed ? 0 : (.72 + .5 * exposure) * (1 - .84 * shelter),
        seaGain: disposed ? 0 : (.94 - .12 * exposure) * (1 - .65 * shelter),
        loopBuffers: weatherBuffers.length, modulators: modulators.length,
        clock: Number((context?.currentTime || 0).toFixed(3)),
      },
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
    for (const layer of weather) {
      try { layer.source.stop(); } catch { /* already stopped */ }
      layer.source.disconnect(); layer.high.disconnect(); layer.low.disconnect();
      layer.level.disconnect(); layer.panner?.disconnect();
    }
    for (const modulation of modulators) {
      try { modulation.oscillator.stop(); } catch { /* already stopped */ }
      modulation.oscillator.disconnect(); modulation.amount.disconnect();
    }
    weather.length = 0; modulators.length = 0; weatherBuffers.length = 0;
    windBus?.disconnect(); seaBus?.disconnect(); weatherBus?.disconnect();
    windBus = null; seaBus = null; weatherBus = null; weatherGain = 0;
    master?.disconnect(); limiter?.disconnect(); noiseBuffer = null;
    if (context && context.state !== 'closed') Promise.resolve(context.close()).catch(() => {});
  }
  return { unlock, setMuted, update, transition, diagnostics, dispose };
}
