const GUI = lil.GUI;

const NUM_INSTRUMENTS = 6;
const NOFILL_INSTS = [5];
const HARMONY_INSTRS = [0];
const HARMONY_MAP = {
  60: 'I',
  61: 'BII',
  62: 'IV',
  63: 'V',
}
const POLY_INSTS = [4];

const settings = {
  speed: 5,
  ystart: 250,
  margin: 80,
  noteHeight: 20,
  midiDevice: null,
}
const instStatus = []

for (let i = 0; i < NUM_INSTRUMENTS; i++) {
  instStatus.push({ currentNotes: {}, finishedNotes: [] });
  settings[`instrument${i + 1}`] = i + 1;
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
        const degree = HARMONY_MAP[note.number] || '?'
        drawHarmonyFinishedNote(note.on, note.dur, degree, yoff)
      } else {
        const yoffNote = POLY_INSTS.includes(j) ? yoff + (60 - note.number) * settings.noteHeight : yoff
        drawFinishedNote(note.on, note.dur, yoffNote)
      }
    }

    for (let [number, noteOn] of Object.entries(status.currentNotes)) {
      if (HARMONY_INSTRS.includes(j)) {
        const degree = HARMONY_MAP[number] || '?'
        drawHarmonyNote(noteOn, degree, yoff)
      } else {
        const yoffNote = POLY_INSTS.includes(j) ? yoff + (60 - number) * settings.noteHeight : yoff
        drawNote(noteOn, yoffNote)
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
    const channelNum = settings[`instrument${i + 1}`]
    const channel = device.channels[channelNum];

    const status = instStatus[i];

    channel.addListener("noteon", e => {
      // console.debug(channelNum, "noteon", e.note.identifier, e.note.number, e.note.attack, e.note.release)
      if (POLY_INSTS.includes(i) ? status.currentNotes[e.note.number] : Object.keys(status.currentNotes).length > 0) return
      status.currentNotes[e.note.number] = frameCount
    });

    channel.addListener("noteoff", e => {
      // console.debug(channelNum, "noteoff", e.note.identifier, e.note.number, e.note.attack, e.note.release)
      // if (status.currentNotes[e.note.number]) return
      const noteOn = status.currentNotes[e.note.number]
      delete status.currentNotes[e.note.number]
      status.finishedNotes.push({ on: frameCount, dur: (frameCount - noteOn), number: e.note.number })
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
    gui.add(settings, `instrument${i + 1}`, Array.from({ length: 16 }, (_, i) => i + 1))
      .onChange(setMidiDevice)
      .onFinishChange(savePreset)
  }

  loadPreset()
  setMidiDevice()
}