/* --- Dependencies ---------------------------------- */

var express = require('express');
var Client = require('node-rest-client').Client;
var i2cBus = require('i2c-bus');
var ws281x = require('rpi-ws281x-native');
var wpi = require("wiring-pi");
var stepperWiringPi = require("./stepper-wiringpi");
var Pca9685Driver = require("pca9685").Pca9685Driver;

var client = new Client();

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

const numberOfRgbLeds = 3;
const numberOfNeoPixels = 15;

var rgbLedFunction = ledFunction.OFF;
var neoPixelFunction = ledFunction.OFF;

var rgbLedBlinkState = false;
var rgbLedCurrent = 0;

var neoPixelBlinkState = false;
var neoPixelCurrent = 0;

var ip = require("ip");
var os = require("os");

/* --- Setup subsystems ------------------------------- */

// Setup web server
var app = express();
app.set('port', (process.env.PORT || 3002));

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
    case "g":
      return (color >> 8) & 0xff;
    case "b":
      return color & 0xff;
  }
  return 0;
}

function parseColorsString(colorsString) {
  var strings = colorsString.split(",");
  var colors = [];
  strings.forEach(function (colorString) {
    colors.push(parseInt(colorString, 10));
  });
  return colors;
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

function lightsOffNeoPixel() {
  for (var i = 0; i < NUM_LEDS; i++) {
    pixelData[i] = colorCombine(0, 0, 0);
  }
  ws281x.render(pixelData);
}

function lightsOffRgbLed() {
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

function calibrateFlag() {
  if (readPositionFlagSensor() == 1) {
    setLedColor(0, rgbLedColorSet[0]);
    setLedColor(1, rgbLedColorSet[1]);
    setLedColor(2, rgbLedColorSet[2]);
    motor1.step(stepRange, function () {
      if (readPositionFlagSensor() == 1) {
        calibrateFlag();
      }
      else {
        lightsOffRgbLed();
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
      else {
        flagStatus = 2;
        currentFlagPosition = 0;
      }
    })
  }
  else {
    flagStatus = 2;
  }
}

/* --- Color sets ---------------------------------- */

var rgbLedColorSet = [
  colorCombine(255, 0, 0),
  colorCombine(0, 255, 0),
  colorCombine(0, 0, 255)
];

var neoPixelColorSet = [
  colorCombine(255, 0, 0),
  colorCombine(0, 255, 0),
  colorCombine(0, 0, 255),
  colorCombine(255, 0, 0),
  colorCombine(0, 255, 0),
  colorCombine(0, 0, 255),
  colorCombine(255, 0, 0),
  colorCombine(0, 255, 0),
  colorCombine(0, 0, 255),
  colorCombine(255, 0, 0),
  colorCombine(0, 255, 0),
  colorCombine(0, 0, 255),
  colorCombine(255, 0, 0),
  colorCombine(0, 255, 0),
  colorCombine(0, 0, 255),
];

/* --- Processing functions ---------------------------------- */

function reportUrl() {
  var link = 'http://' + ip.address() + ':3000';
  var url = 'https://buildflag-hub.herokuapp.com/api/updateTarget?name=' + os.hostname() + '&link=' + link;
  console.log(url)
  client.get(url, function (data, response) {
    console.log(url)
  });
}

function processFlag() {
  // Check for inital calibration
  if (flagStatus == 0) {
    flagStatus = 1;
    calibrateFlag();
  }

  // Check for moving flag request
  if (flagStatus == 2 && (currentFlagPosition != nextFlagPosition)) {
    flagStatus = 3;
    MoveFlagToPosition();
  }

  // Notify clients about positions
  notifyChangedFlagPosition();
}

function processRgbLed() {
  switch (rgbLedFunction) {
    case ledFunction.OFF:
      lightsOffRgbLed();
      break;
    case ledFunction.ON:
      setLedColor(0, rgbLedColorSet[0]);
      setLedColor(1, rgbLedColorSet[1]);
      setLedColor(2, rgbLedColorSet[2]);
      break;
    case ledFunction.ROTATE:
      for (ledIndex = 0; ledIndex < numberOfRgbLeds; ledIndex++) {
        var colorIndex = (rgbLedCurrent + ledIndex) % numberOfRgbLeds;
        setLedColor(ledIndex, rgbLedColorSet[colorIndex])
      }
      rgbLedCurrent = (rgbLedCurrent + 1) % numberOfRgbLeds;
      break;
    case ledFunction.BLINK:
      if (rgbLedBlinkState) {
        setLedColor(0, rgbLedColorSet[0]);
        setLedColor(1, rgbLedColorSet[1]);
        setLedColor(2, rgbLedColorSet[2]);
        rgbLedBlinkState = false
      }
      else {
        lightsOffRgbLed();
        rgbLedBlinkState = true;
      }
      break;
  }
}

function processNeoPixel() {
  switch (neoPixelFunction) {
    case ledFunction.OFF:
      lightsOffNeoPixel();
      break;
    case ledFunction.ON:
      ws281x.render(neoPixelColorSet);
      break;
    case ledFunction.ROTATE:
      var rotateColorSet = [];
      for (ledIndex = 0; ledIndex < numberOfNeoPixels; ledIndex++) {
        var colorIndex = (neoPixelCurrent + ledIndex) % numberOfNeoPixels;
        rotateColorSet.push(neoPixelColorSet[colorIndex])
      }
      ws281x.render(rotateColorSet);
      neoPixelCurrent = (neoPixelCurrent + 1) % numberOfNeoPixels;
      break;
    case ledFunction.BLINK:
      if (neoPixelBlinkState) {
        ws281x.render(neoPixelColorSet);
        neoPixelBlinkState = false
      }
      else {
        lightsOffNeoPixel();
        neoPixelBlinkState = true;
      }
      break;
  }
}

/* --- Rest api ---------------------------------- */

// Get status, flag positions in %, rgb led function, neopixel function
app.get('/getStatus', function (req, res) {
  res.json({
    flagPosition: {
      current: Math.round(currentFlagPosition / stepFactor),
      next: Math.round(nextFlagPosition / stepFactor)
    },
    rgbLedFunction: getLedFunctionEnumString(rgbLedFunction),
    neoPixelFunction: getLedFunctionEnumString(neoPixelFunction)
  });
})

// Set flag position in %
app.get('/setflag/:position', function (req, res) {
  nextFlagPosition = req.params.position * stepFactor;
  notifyChangedFlagPosition();
  res.json('OK')
})

// Set rgbled function, function: Off, On, Rotate, Blink
app.get('/setrgbled/function/:function', function (req, res) {
  var functionValue = parseLedFunctionEnum(req.params.function);
  rgbLedFunction = functionValue;
  notifyChangedRgbLedFunction();
  res.json('OK')
})

// Set neopixel function, function: Off, On, Rotate, Blink
app.get('/setneopixel/function/:function', function (req, res) {
  var functionValue = parseLedFunctionEnum(req.params.function);
  neoPixelFunction = functionValue;
  notifyChangedNeoPixelFunction();
  res.json('OK')
})

// Set rgbled colors
app.get('/setrgbled/colors/:colors', function (req, res) {
  var colors = parseColorsString(req.params.colors);
  rgbLedColorSet = colors;
  res.json('OK')
})

// Set neopixel colors
app.get('/setneopixel/colors/:colors', function (req, res) {
  var colors = parseColorsString(req.params.colors);
  neoPixelColorSet = colors;
  res.json('OK')
})

/* --- System setup and processing loop ---------------------------------- */

var signals = {
  'SIGINT': 2,
  'SIGTERM': 15
};

function shutdown(signal, value) {
  lightsOffNeoPixel();
  lightsOffRgbLed();
  process.nextTick(function () {
    process.exit(0);
  });
}

Object.keys(signals).forEach(function (signal) {
  process.on(signal, function () {
    shutdown(signal, signals[signal]);
  });
});

// Main processing loop, runs 2Hz
const server = app.listen(app.get('port'), () => {
  console.log(`Find the server at: http://localhost:${app.get('port')}/`); // eslint-disable-line no-console
  setInterval(function () {
    processFlag();
    processRgbLed();
    processNeoPixel();
  }, 500);
  setInterval(function () {
    reportUrl();
  }, 60*1000)
});

/* --- Client push setup and functions ---------------------------------- */

const io = require('socket.io')(server);

function notifyChangedFlagPosition() {
  io.emit("flagPosition", {
    current: Math.round(currentFlagPosition / stepFactor),
    next: Math.round(nextFlagPosition / stepFactor)
  });
}

function notifyChangedRgbLedFunction() {
  io.emit("rgbLedFunction", {
    rgbLedFunction: getLedFunctionEnumString(rgbLedFunction),
  });
}

function notifyChangedNeoPixelFunction() {
  io.emit("neoPixelFunction", {
    neoPixelFunction: getLedFunctionEnumString(neoPixelFunction),
  });
}

