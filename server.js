/* --- Dependencies ---------------------------------- */

var express = require('express');

var i2cBus = require('i2c-bus');
var ws281x = require('rpi-ws281x-native');
var wpi = require("wiring-pi");
var stepperWiringPi = require("./stepper-wiringpi");
var Pca9685Driver = require("pca9685").Pca9685Driver;

/* --- State variables ------------------------------- */

const stepFactor = 230;       // Factor for computing number of steps from %
const stepRange = 500;        // Number of steps for each separate motor run
var currentFlagPosition = 0;  // Current flag position in steps
var nextFlagPosition = 0;     // Flag position in steps
var flagStatus = 0;           // 0=init, 1=calibrate, 2=stopped, 3=moving

var ledFunction = {
  OFF: 'Off',
  ON: 'On',
  ROTATE: 'Rotate',
  BLINK: 'Blink'
};

var rgbLedFunction = ledFunction.OFF;
var neoPixelFunction = ledFunction.OFF;


/* --- Setup subsystems ------------------------------- */

// Setup web server
var app = express();

// Setup Neopixel Leds
var NUM_LEDS = 15;
var pixelData = new Uint32Array(NUM_LEDS);
var brightness = 128;
ws281x.init(NUM_LEDS);

// Setup RGB leds
var options = {
  i2c: i2cBus.openSync(1),
  address: 0x40,
  frequency: 50,
  debug: false
};

var pwm = new Pca9685Driver(options, function (err) {
  if (err) {
    console.error("Error initializing PCA9685");
    process.exit(-1);
  }
});

// Setup sensor for detecting flag at bottom
var sensorpin = 24;
wpi.pinMode(sensorpin, wpi.INPUT);

// Setup stepper motor for flag
var pin1 = 17;
var pin2 = 27;
var pin3 = 22;
var pin4 = 23;
wpi.setup('gpio');
var motor1 = stepperWiringPi.setup(200, pin1, pin2, pin3, pin4);
motor1.setSpeed(200);

/* --- Common functions ------------------------------- */

// Generate integer from RGB value
function colorCombine(r, g, b) {
  r = r * brightness / 255;
  g = g * brightness / 255;
  b = b * brightness / 255;
  return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
}

// Extraxt color part (r,g,b) from integer
function colorExtract(color, name) {
  switch (name) {
    case "r":
       return (color >> 16) & 0xff;
    break;
    case "g":
       return (color >> 8) & 0xff;
    break;
    case "b":
       return color  & 0xff;
    break;
  }
  return 0;
}

function parseLedFunctionEnum(value) {
  var parsedFunction = ledFunction.OFF;
  switch (value) {
    case "Off":
      parsedFunction = ledFunction.OFF;
      break;
    case "On":
      parsedFunction = ledFunction.ON;
      break;
    case "Rotate":
      parsedFunction = ledFunction.ROTATE;
      break;
    case "Blink":
      parsedFunction = ledFunction.BLINK;
      break;
  }
  return parsedFunction;
}

function getLedFunctionEnumString(value) {
  var functionString;
  switch (value) {
    case ledFunction.OFF:
      functionString = "Off";
      break;
    case ledFunction.ON:
      functionString = "On";
      break;
    case ledFunction.ROTATE:
      functionString = "Rotate";
      break;
    case ledFunction.BLINK:
      functionString = "Blink";
      break;
  }
  return functionString;
}

function lightsOffNeoPixels() {
  for (var i = 0; i < NUM_LEDS; i++) {
    pixelData[i] = colorCombine(0, 0, 0);
  }
  
  ws281x.render(pixelData);
}

function lightsOffRgbLeds() {
  pwm.allChannelsOff();
}

function setLedColor(ledNumber, color) {
  var r = colorExtract(color, "r") / 255.0;
  var g = colorExtract(color, "g") / 255.0;
  var b = colorExtract(color, "b") / 255.0;
  var ledIndex = ledNumber * 4;
  pwm.setDutyCycle(ledIndex, r);
  pwm.setDutyCycle(ledIndex + 1, g);
  pwm.setDutyCycle(ledIndex + 2, b);
}

function readPositionFlagSensor() {
  return wpi.digitalRead(sensorpin)
}

function moveFlagToBottom() {
  if (readPositionFlagSensor() == 1) {
    motor1.step(stepRange, function () {
      if (readPositionFlagSensor() == 1) {
        moveFlagToBottom();
      }
      else {
        currentFlagPosition = 0;
        flagStatus = 2;
      }
    })
  }
  else {
    currentFlagPosition = 0;
    flagStatus = 2;
  }
}

function MoveFlagToPosition() {
  if (currentFlagPosition != nextFlagPosition) {
    var steps = (currentFlagPosition - nextFlagPosition);
    if (steps > stepRange) {
      steps = stepRange;
    }
    if (steps < -stepRange) {
      steps = -stepRange;
    }
    motor1.step(steps, function () {
      currentFlagPosition -= steps;
      if (readPositionFlagSensor() == 1) {
        MoveFlagToPosition();
      }
    })
  }
  else {
    flagStatus = 2;
  }
}

/* --- Color sets ---------------------------------- */

var rgbLedColorSet = [
  colorCombine(255, 0, 0, 255),
  colorCombine(0, 255, 0, 255),
  colorCombine(0, 0, 255, 255)
];

var neoPixelColorSet = [
  colorCombine(255, 0, 0, 255),
  colorCombine(0, 255, 0, 255),
  colorCombine(0, 0, 255, 255),
  colorCombine(255,255,255,255),
  colorCombine(0, 255, 0, 255),
  colorCombine(0, 255, 0, 255),
  colorCombine(0, 255, 0, 255),
  colorCombine(0, 255, 0, 255),
  colorCombine(0, 255, 0, 255),
  colorCombine(0, 255, 0, 255),
  colorCombine(0, 255, 0, 255),
  colorCombine(0, 255, 0, 255),
  colorCombine(0, 255, 0, 255),
  colorCombine(0, 255, 0, 255),
  colorCombine(0, 255, 0, 255)
];

/* --- Processing functions ---------------------------------- */

function processFlag() {

  // Check for inital calibration
  if (flagStatus == 0) {
    flagStatus = 1;
    moveFlagToBottom();
  }

  // Check for moving flag request
  if (flagStatus == 2 && (currentFlagPosition != nextFlagPosition)) {
    flagStatus = 3;
    MoveFlagToPosition();
  }

  // Notify clients about positions
  notifyChangedFlagPosition();
}

function processNeoPixels() {
  ws281x.render(neoPixelColorSet);
  switch (neoPixelFunction) {
    case ledFunction.OFF:
      //lightsOffNeoPixels();
      break;
    case ledFunction.ON:
      // Set to color
      break;
    case ledFunction.ROTATE:
      // Rotate with color set
      break;
    case ledFunction.BLINK:
      // Blink with color set
      break;
  }
}

function processRgbLeds() {
  setLedColor(0, rgbLedColorSet[2]);
  switch (rgbLedFunction) {
    case ledFunction.OFF:
      //lightsOffRgbLeds();
      break;
    case ledFunction.ON:
      setLedColor(0, rgbLedColorSet[0]);
      break;
    case ledFunction.ROTATE:
      // Rotate with color set
      break;
    case ledFunction.BLINK:
      // Blink with color set
      break;
  }
}

/* --- Rest api ---------------------------------- */

// Set flag position in %
app.get('/setflag/:position', function (req, res) {
  nextFlagPosition = req.params.position * stepFactor;
  console.log("in setflag: ", nextFlagPosition);
  notifyChangedFlagPosition();
  res.json('OK')
})

// Get flag position in %
app.get('/getflag', function (req, res) {
  console.log("in getflag");
  res.json({
    current: Math.round(currentFlagPosition / stepFactor),
    next: Math.round(nextFlagPosition / stepFactor)
  });
})

// Set neopixel function, function: Off, On, Rotate, Blink
app.get('/setneopixel/function/:function', function (req, res) {
  functionValue = parseLedFunctionEnum(req.params.function);
  console.log("in setneopixel: function ", functionValue);
  res.send('OK')
})

// Get neopixel function
app.get('/getneopixel', function (req, res) {
  var functionValue = getLedFunctionEnumString(neoPixelFunction);
  console.log("in getneopixel: function ", functionValue);
  res.json({
    function: functionValue
  });
})

// Set rgbled function, function: Off, On, Rotate, Blink
app.get('/setrgbled/function/:function', function (req, res) {
  rgbLedsFunction = parseLedFunctionEnum(req.params.function);
  console.log("in setrgbled: function ", rgbLedsFunction);
  res.send('OK')
})

// Get rgbled function
app.get('/getrgbled', function (req, res) {
  var functionValue = getLedFunctionEnumString(rgbLedFunction);
  console.log("in getrgbled: function ", functionValue);
  res.json({
    function: functionValue
  });
})

/* --- System setup and processing loop ---------------------------------- */

var signals = {
  'SIGINT': 2,
  'SIGTERM': 15
};

function shutdown(signal, value) {
  lightsOffNeoPixels();
  lightsOffRgbLeds();
  process.nextTick(function () {
    process.exit(0);
  });
}

Object.keys(signals).forEach(function (signal) {
  process.on(signal, function () {
    shutdown(signal, signals[signal]);
  });
});

// Main processing loop, runs 1Hz
const server = app.listen(3001, function () {
  setInterval(function () {
    processFlag();
    processNeoPixels();
    processRgbLeds();
  }, 1000);
});

/* --- Client push setup and functions ---------------------------------- */

const io = require('socket.io')(server);

io.on('connection', (socket) => {
  console.log('dashboard connected');

  socket.on('disconnect', () => {
    console.log('dashboard disconnected');
  });
})

function notifyChangedFlagPosition() {
  io.emit("flagPosition", {
    current: Math.round(currentFlagPosition / stepFactor),
    next: Math.round(nextFlagPosition / stepFactor)
  });
}
