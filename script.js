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
