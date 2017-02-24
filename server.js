/* --- Dependencies ---------------------------------- */

var express = require('express');

//var i2cBus = require('i2c-bus');
//var ws281x = require('rpi-ws281x-native');
//var wpi = require("wiring-pi");
//var stepperWiringPi = require("stepper-wiringpi");
//var Pca9685Driver = require("pca9685").Pca9685Driver;

/* --- State variables ------------------------------- */

var ledFunction = {
  OFF: 'Off',
  ON: 'On',
  ROTATE: 'Rotate',
  BLINK: 'Blink'
};

var currentFlagPosition = -1; // Flag position -1 => unknown, need to calibrate position
var nextFlagPosition = 0; // Flag position in percentage, 0% at bottom 100% at top
var flagMoving = false;

var rgbLedFunction = ledFunction.OFF;
var neoPixelFunction = ledFunction.OFF;

/* --- Setup subsystems ------------------------------- */

// Setup web server
var app = express();
//app.use(express.static('build'));

// Setup Neopixel Leds
var NUM_LEDS = 15;
var pixelData = new Uint32Array(NUM_LEDS);
var brightness = 128;
//ws281x.init(NUM_LEDS);

// Setup RGB leds
var options = {
  //i2c: i2cBus.openSync(1),
  address: 0x40,
  frequency: 50,
  debug: false
};

/*
var pwm = new Pca9685Driver(options, function(err) {
  if (err) {
      console.error("Error initializing PCA9685");
      process.exit(-1);
  }
});
*/

// Setup sensor for detecting flag at bottom
var sensorpin = 24;
//wpi.pinMode(sensorpin, wpi.INPUT);

// Setup stepper motor for flag
var pin1 = 17;
var pin2 = 27;
var pin3 = 22;
var pin4 = 23;
//wpi.setup('gpio');
//var motor1 = stepperWiringPi.setup(200, pin1, pin2, pin3, pin4);
//motor1.setSpeed(200);

// Setup sensor for detecting flag at bottom
var sensorpin = 24;
//wpi.pinMode(sensorpin, wpi.INPUT);

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

  //ws281x.render(pixelData);
}

function lightsOffRgbLeds() {
  //pwm.setDutyCycle(0, 0.0);
  //pwm.setDutyCycle(1, 0.0);
  //pwm.setDutyCycle(2, 0.0);
}

function readPositionFlagSensor() {
  return 0; //wpi.digitalRead(sensorpin)
}

/* --- Processing functions ---------------------------------- */

function processFlag() {
  //console.log("Sensor: ", readPositionFlagSensor());

  // if currentposition == -1, then move flag towards bottom
  // if flag at bottom, set current position to 0,
  // if currentPosition != nextPosition, mode flag towards next position
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
  nextFlagPosition = req.params.position;
  console.log("in setflag: ", nextFlagPosition);
  sendToClient();
  res.json('OK')
})

// Get flag position in %
app.get('/getflag', function (req, res) {
  console.log("in getflag");
  res.json({
    current: currentFlagPosition,
    next: nextFlagPosition
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

function sendToClient() {
  io.emit("flagPosition", { current: currentFlagPosition, next: nextFlagPosition });
}

const io = require('socket.io')(server);  

io.on('connection', (socket) => {  
  console.log('a user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('room', (data) => {
    console.log('Got room ' + data.room);
  });
})



