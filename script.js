const GUI = lil.GUI;

const settings = {
  midiDevice: null,
  midiChannel: 1
}

// Create a new canvas to the browser size
function setup() {
  createCanvas(windowWidth, windowHeight);
}

// On window resize, update the canvas size
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(0);
  fill(255);
  rect(100, 200, 300, 300);
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
  });

  channel.addListener("noteoff", e => {
    console.log("noteoff", e.note.identifier, e.note.number, e.note.attack, e.note.release)
  });

  console.log(`Listening on MIDI input '${settings.midiDevice}' channel ${settings.midiChannel}`)
}

function init() {
  const gui = new GUI();

  // Enable WEBMIDI.js and trigger the onEnabled() function when ready
  WebMidi
    .enable()
    .then(onEnabled)
  // .catch(err => alert(err));

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

    gui.add(settings, 'midiDevice', WebMidi.inputs.map(dev => dev.name)).onChange(connectMidiDevice)
    gui.add(settings, 'midiChannel', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]).onChange(connectMidiDevice)

    connectMidiDevice()
  }
}

init()