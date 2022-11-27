const GUI = lil.GUI;

const NUM_INSTRUMENTS = 6;
const NOFILL_INSTS = [5];
const HARMONY_INSTRS = [0];
const HARMONY_MAP = {
  'C3': 'I',
  'D3': 'BII',
  'E3': 'IV',
  'F3': 'V',
}

const settings = {
  speed: 5,
  ystart: 250,
  margin: 80,
  noteHeight: 20,
  midiDevice: null,
}
const instStatus = []

for (let i = 0; i < NUM_INSTRUMENTS; i++) {
  instStatus.push({ noteOn: null, ident: null, finishedNotes: [] });
  settings[`midiChannel${i + 1}`] = i + 1;
}

let font;

function preload() {
  font = loadFont('assets/DePixelHalbfett.otf');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont(font);
  textSize(12);
  textAlign(RIGHT);
  noSmooth();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function drawNote(noteOn, yoff) {
  const speed = settings.speed;
  rect(0, yoff, (frameCount - noteOn) * speed, settings.noteHeight);
}

function drawFinishedNote(noteOn, duration, yoff) {
  const speed = settings.speed;
  rect((frameCount - noteOn) * speed, yoff, duration * speed, settings.noteHeight);
}

function drawHarmonyNote(noteOn, degree, yoff) {
  const speed = settings.speed;
  const x2 = (frameCount - noteOn) * speed;
  fill(255)
  noStroke()
  text(degree, x2, yoff + 16);
  noFill()
  stroke(255)
  line(0, yoff, x2, yoff);  // horizontal line
  line(x2, yoff, x2, yoff + settings.noteHeight);  // vertical line
  // rect(0, yoff, x2, settings.noteHeight);
}

function drawHarmonyFinishedNote(noteOn, duration, degree, yoff) {
  const speed = settings.speed;
  fill(255)
  noStroke()
  text(degree, ((frameCount - noteOn) + duration) * speed, yoff + 16);
  noFill()
  stroke(255)
  const x1 = (frameCount - noteOn) * speed
  const x2 = x1 + duration * speed;
  line(x1, yoff, x2, yoff);  // horizontal line
  line(x2, yoff, x2, yoff + settings.noteHeight);  // vertical line
  // rect(x1, yoff, x2, settings.noteHeight);

}

function draw() {
  background(0);

  for (let j = 0; j < instStatus.length; j++) {
    const status = instStatus[j];

    if (NOFILL_INSTS.includes(j)) {
      noFill();
      stroke(255);
    } else {
      fill(255);
      stroke(0);
    }

    // Remove finished notes outside screen
    const frameScreenLimit = frameCount - windowWidth / settings.speed
    status.finishedNotes = status.finishedNotes.filter(note => note.on > frameScreenLimit)

    const yoff = settings.margin * j - settings.ystart;

    for (let i = 0; i < status.finishedNotes.length; i++) {
      const note = status.finishedNotes[i];
      if (HARMONY_INSTRS.includes(j)) {
        // console.log("ident", note.ident)
        const degree = HARMONY_MAP[note.ident] || '?'
        drawHarmonyFinishedNote(note.on, note.dur, degree, yoff)
      } else {
        drawFinishedNote(note.on, note.dur, yoff)
      }
    }

    if (status.noteOn) {
      if (HARMONY_INSTRS.includes(j)) {
        // console.log("ident", note.ident)
        const degree = HARMONY_MAP[status.ident] || '?'
        drawHarmonyNote(status.noteOn, degree, yoff)
      } else {
        drawNote(status.noteOn, yoff)
      }
    }
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

  for (let i = 0; i < NUM_INSTRUMENTS; i++) {
    const channelNum = settings[`midiChannel${i + 1}`]
    const channel = device.channels[channelNum];

    const status = instStatus[i];

    channel.addListener("noteon", e => {
      // console.debug(channelNum, "noteon", e.note.identifier, e.note.number, e.note.attack, e.note.release)
      if (status.ident && status.ident !== e.note.identifier) return
      status.noteOn = frameCount
      status.ident = e.note.identifier
    });

    channel.addListener("noteoff", e => {
      // console.debug(channelNum, "noteoff", e.note.identifier, e.note.number, e.note.attack, e.note.release)
      if (e.note.identifier !== status.ident) return
      const note = { on: frameCount, dur: (frameCount - status.noteOn), ident: e.note.identifier }
      status.noteOn = null
      status.ident = null
      status.finishedNotes.push(note)
    });
  }
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
gui.add(settings, 'ystart', -500, 500).onFinishChange(savePreset)
gui.add(settings, 'margin', 10, 160).onFinishChange(savePreset)
gui.add(settings, 'noteHeight', 1, 100).onFinishChange(savePreset)

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
  for (let i = 0; i < NUM_INSTRUMENTS; i++) {
    gui.add(settings, `midiChannel${i + 1}`, Array.from({ length: 16 }, (_, i) => i + 1))
      .onChange(setMidiDevice)
      .onFinishChange(savePreset)
  }

  loadPreset()
  setMidiDevice()
}