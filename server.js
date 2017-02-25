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

// Setup sensor for detecting flag at bottom
var sensorpin = 24;
wpi.pinMode(sensorpin, wpi.INPUT);

/* --- Common functions ------------------------------- */

// generate integer from RGB value
function color(r, g, b) {
  r = r * brightness / 255;
  g = g * brightness / 255;
  b = b * brightness / 255;
  return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
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
    pixelData[i] = color(0, 0, 0);
  }

  ws281x.render(pixelData);
}

function lightsOffRgbLeds() {
  pwm.setDutyCycle(0, 0.0);
  pwm.setDutyCycle(1, 0.0);
  pwm.setDutyCycle(2, 0.0);
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
    if (steps < -stepRange)
    {
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

/* --- Processing functions ---------------------------------- */

function processFlag() {
  console.log("Sensor: ", readPositionFlagSensor());
  console.log("flagStatus: ", flagStatus);

  // Check for inital calibration
  if (flagStatus == 0) {
    flagStatus = 1;
    console.log("Starting calibrate");
    moveFlagToBottom();
  }

  // Check for moving flag request
  if (flagStatus == 2 && (currentFlagPosition != nextFlagPosition)) {
    console.log("Start moving flag");
    flagStatus = 3;
    MoveFlagToPosition();
  }

  // Notify clients
  notifyChangedFlagPosition();
}

function processNeoPixels() {
  switch (neoPixelFunction) {
    case ledFunction.OFF:
      lightsOffNeoPixels();
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
  pwm.setDutyCycle(0, 1.0);
  switch (rgbLedFunction) {
    case ledFunction.OFF:
      lightsOffRgbLeds();
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
  neoPixelFunction = parseLedFunctionEnum(req.params.function);
  console.log("in setneopixel: function ", neoPixelFunction);
  res.send('OK')
})

// Get neopixel function
app.get('/getneopixel', function (req, res) {
  var functionValue = getLedFunctionEnumString(neoPixelFunction);
  console.log("in getneopixel: ", functionValue);
  res.json({
    function: functionValue
  });
})

// Set rgbled function, function: Off, On, Rotate, Blink
app.get('/setrgbled/function/:function', function (req, res) {
  rgbLedFunction = parseLedFunctionEnum(req.params.function);
  res.send('OK')
})

// Get rgbled function
app.get('/getrgbled', function (req, res) {
  var functionValue = getLedFunctionEnumString(rgbLedFunction);
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