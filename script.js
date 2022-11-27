const GUI = lil.GUI;

const NOTE_HEIGHT = 40;
const NUM_RHYTHM_INSTRUMENTS = 5;

const settings = {
  midiDevice: null,
  midiChannel1: 1,
  midiChannel2: 2,
  midiChannel3: 3,
  midiChannel4: 4,
  midiChannel5: 5,
  speed: 10,
}

const statusRhythm = []

let noteOn = null
let noteOnIdent = null
let finishedNotes = []
let font;

function preload() {
  font = loadFont('assets/DePixelHalbfett.otf');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont(font);
  textSize(16);
  noSmooth();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function drawFinishedNote(noteOn, duration, yoff) {
  const speed = settings.speed;
  const y = yoff + (windowHeight / 2) - (NOTE_HEIGHT / 2)
  rect((frameCount - noteOn) * speed, y, duration * speed, NOTE_HEIGHT);
}

function drawNote(noteOn, yoff) {
  const speed = settings.speed;
  const y = yoff + (windowHeight / 2) - (NOTE_HEIGHT / 2)
  rect(0, y, (frameCount - noteOn) * speed, NOTE_HEIGHT);
}

function draw() {
  background(0);
  fill(255);

  for (let j = 0; j < statusRhythm.length; j++) {
    const status = statusRhythm[j];

    // Remove finished notes outside screen
    const frameScreenLimit = frameCount - windowWidth / settings.speed
    status.finishedNotes = status.finishedNotes.filter(note => note.on > frameScreenLimit)

    // text('SNARE', 10, 50);

    const yoff = 120 * j - 230;

    for (let i = 0; i < status.finishedNotes.length; i++) {
      const note = status.finishedNotes[i];
      drawFinishedNote(note.on, note.dur, yoff)
    }

    if (status.noteOn) drawNote(status.noteOn, yoff)
  }
}

function resetListeners() {
  WebMidi.inputs.forEach(device => {
    device.channels.forEach(channel => {
      channel.removeListener("noteon");
      channel.removeListener("noteoff");
    })
  })
}

function setMidiDevice() {
  resetListeners();

  const device = WebMidi.inputs.filter(d => d.name === settings.midiDevice)[0]
  if (!device) {
    console.error(`No MIDI input device named '${settings.midiDevice}' was found!`)
    return
  }

  for (let i = 0; i < NUM_RHYTHM_INSTRUMENTS; i++) {
    const channelNum = settings[`midiChannel${i + 1}`]
    const channel = device.channels[channelNum];

    const status = statusRhythm[i];

    channel.addListener("noteon", e => {
      console.log(channelNum, "noteon", e.note.identifier, e.note.number, e.note.attack, e.note.release)
      if (status.ident && status.ident !== e.note.identifier) return
      status.noteOn = frameCount
      status.ident = e.note.identifier
    });

    channel.addListener("noteoff", e => {
      console.log(channelNum, "noteoff", e.note.identifier, e.note.number, e.note.attack, e.note.release)
      if (e.note.identifier !== status.ident) return
      const note = { on: frameCount, dur: (frameCount - status.noteOn) }
      status.noteOn = null
      status.ident = null
      status.finishedNotes.push(note)
    });
  }
}


// Build status for rhythimc instruments
for (let i = 0; i < NUM_RHYTHM_INSTRUMENTS; i++) {
  statusRhythm.push({ noteOn: null, ident: null, finishedNotes: [] });
}


const gui = new GUI();

function savePreset() {
  const preset = gui.save();
  localStorage.setItem('preset', JSON.stringify(preset));
}

function loadPreset() {
  const preset = localStorage.getItem('preset');
  if (!preset) return;
  gui.load(JSON.parse(preset));
}

gui.add(settings, 'speed', 0.1, 30).onFinishChange(savePreset)

// Enable WEBMIDI.js and trigger the onEnabled() function when ready
WebMidi
  .enable()
  .then(onEnabled)

// Function triggered when WEBMIDI.js is ready
function onEnabled() {
  if (WebMidi.inputs.length < 1) {
    console.error("No MIDI input devices were found :(")
    return
  }

  console.log(`${WebMidi.inputs.length} MIDI devices found:`);
  WebMidi.inputs.forEach((device, i) => {
    console.log(`[${i}] ${device.name}`)
  })

  settings.midiDevice = WebMidi.inputs[0].name

  gui.add(settings, 'midiDevice', WebMidi.inputs.map(dev => dev.name))
    .onChange(setMidiDevice)
    .onFinishChange(savePreset);
  for (let i = 0; i < NUM_RHYTHM_INSTRUMENTS; i++) {
    gui.add(settings, `midiChannel${i + 1}`, Array.from({ length: 16 }, (_, i) => i + 1))
      .onChange(setMidiDevice)
      .onFinishChange(savePreset)
  }

  loadPreset()
  setMidiDevice()
}