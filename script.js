const midiDeviceName = "Midi Through Port-0"
const midiChannel = 1;

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

function init() {
  // Enable WEBMIDI.js and trigger the onEnabled() function when ready
  WebMidi
    .enable()
    .then(onEnabled)
    .catch(err => alert(err));

  // Function triggered when WEBMIDI.js is ready
  function onEnabled() {
    console.log(`${WebMidi.inputs.length} MIDI devices found:`);
    WebMidi.inputs.forEach((device, i) => {
      console.log(`[${i}] ${device.name}`)
    })

    const device = WebMidi.inputs.filter(device => device.name === midiDeviceName)[0];
    if (!device) {
      console.error(`No MIDI device named '${midiDeviceName}' was detected`)
      return;
    }

    console.log(`Ready to listen on MIDI input '${midiDeviceName}' channel ${midiChannel}`)

    device.channels[midiChannel].addListener("noteon", e => {
      console.log("noteon", e.note.identifier, e.note.number, e.note.attack, e.note.release)
    });

    device.channels[midiChannel].addListener("noteoff", e => {
      console.log("noteoff", e.note.identifier, e.note.number, e.note.attack, e.note.release)
    });
  }
}

init()