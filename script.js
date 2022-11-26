const GUI = lil.GUI;

const NOTE_HEIGHT = 40;

const settings = {
  midiDevice: null,
  midiChannel: 1,
  speed: 10,
}

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

function drawFinishedNote(noteOn, duration) {
  const speed = settings.speed;
  const y = (windowHeight / 2) - (NOTE_HEIGHT / 2)
  rect((frameCount - noteOn) * speed, y, duration * speed, NOTE_HEIGHT);
}

function drawNote(noteOn) {
  const speed = settings.speed;
  const y = (windowHeight / 2) - (NOTE_HEIGHT / 2)
  rect(0, y, (frameCount - noteOn) * speed, NOTE_HEIGHT);
}

function draw() {
  background(0);
  fill(255);

  // Remove finished notes outside screen
  const frameScreenLimit = frameCount - windowWidth / settings.speed
  finishedNotes = finishedNotes.filter(note => note.on > frameScreenLimit)

  text('SNARE', 10, 50);

  for (let i = 0; i < finishedNotes.length; i++) {
    const note = finishedNotes[i];
    drawFinishedNote(note.on, note.dur)
  }

  // TODO: clear finished notes when they are out of screen

  if (noteOn) drawNote(noteOn)
}

function connectMidiDevice() {
  const device = WebMidi.inputs.filter(d => d.name === settings.midiDevice)[0]
  if (!device) {
    console.error(`No MIDI input device named '${settings.midiDevice}' was found!`)
    return
  }

  const channel = device.channels[settings.midiChannel];

  channel.addListener("noteon", e => {
    console.log("noteon", e.note.identifier, e.note.number, e.note.attack, e.note.release)
    if (noteOnIdent && noteOnIdent !== e.note.identifier) return
    noteOn = frameCount
    noteOnIdent = e.note.identifier
  });

  channel.addListener("noteoff", e => {
    console.log("noteoff", e.note.identifier, e.note.number, e.note.attack, e.note.release)
    if (e.note.identifier !== noteOnIdent) return
    const note = { on: frameCount, dur: (frameCount - noteOn) }
    noteOn = null
    noteOnIdent = null
    finishedNotes.push(note)
  });

  console.log(`Listening on MIDI input '${settings.midiDevice}' channel ${settings.midiChannel}`)
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
    .onChange(connectMidiDevice)
    .onFinishChange(savePreset);
  gui.add(settings, 'midiChannel', Array.from({ length: 16 }, (_, i) => i + 1))
    .onChange(connectMidiDevice)
    .onFinishChange(savePreset)

  loadPreset()
  connectMidiDevice()
}