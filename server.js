/* --- Dependencies ---------------------------------- */

var express = require('express')
var Client = require('node-rest-client').Client
var ws281x = require('rpi-ws281x-native')

var client = new Client()

/* --- State variables ------------------------------- */

var ledFunction = {
  OFF: 'Off',
  ON: 'On',
  ROTATE: 'Rotate',
  BLINK: 'Blink'
}

const numberOfLeds = 15

var currentLedFunction = ledFunction.ON

var ledBlinkState = false
var ledCurrent = 0

var ip = require("ip")
var os = require("os")


/* --- Color sets ---------------------------------- */

var definedColorSet = [
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
  colorCombine(255, 0, 0),
  colorCombine(0, 255, 0),
  colorCombine(0, 0, 255),
  colorCombine(255, 0, 0)
]

var currentColorSet = new Uint32Array(numberOfLeds)
for (index = 0; index < 19; index++) {
  currentColorSet[index] = definedColorSet[index]
}

/* --- Setup subsystems ------------------------------- */

// Setup web server
var app = express()
app.set('port', (process.env.PORT || 3002))

// Setup Leds
var pixelData = new Uint32Array(numberOfLeds)
ws281x.init(numberOfLeds)

/* --- Common functions ------------------------------- */

// Generate integer from RGB value
function colorCombine(r, g, b) {
  return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff)
}

// Extraxt color part (r,g,b) from integer
function colorExtract(color, name) {
  switch (name) {
    case "r":
      return (color >> 16) & 0xff
    case "g":
      return (color >> 8) & 0xff
    case "b":
      return color & 0xff
  }
  return 0
}

function parseRGBColorsString(colorsString) {
  var strings = colorsString.split(",")
  var colors = []
  strings.forEach(function (colorString) {
    colors.push(parseInt(colorString, 10))
  })
  return colors
}

function parseGRBColorsString(colorsString) {
  var strings = colorsString.split(",")
  var colors = []
  strings.forEach(function (colorString) {
    var c = parseInt(colorString, 10)
    var modifiedColorValue = (((c >> 16) & 255) << 8) + (((c >> 8) & 255) << 16) + (c & 255)
    colors.push(modifiedColorValue)
  })
  return colors
}

function parseLedFunctionEnum(value) {
  var parsedFunction = ledFunction.OFF
  switch (value) {
    case "Off":
      parsedFunction = ledFunction.OFF
      break
    case "On":
      parsedFunction = ledFunction.ON
      break
    case "Rotate":
      parsedFunction = ledFunction.ROTATE
      break
    case "Blink":
      parsedFunction = ledFunction.BLINK
      break
  }
  return parsedFunction
}

function getLedFunctionEnumString(value) {
  var functionString;
  switch (value) {
    case ledFunction.OFF:
      functionString = "Off"
      break;
    case ledFunction.ON:
      functionString = "On"
      break;
    case ledFunction.ROTATE:
      functionString = "Rotate"
      break;
    case ledFunction.BLINK:
      functionString = "Blink"
      break;
  }
  return functionString
}

function lightsOffLeds() {
  currentColorSet.fill(colorCombine(0, 0, 0), 0, 19)
  ws281x.render(currentColorSet)
}

function setLeds(newLedFunction) {
  switch (newLedFunction) {
    case "Off":
      currentColorSet.fill(colorCombine(0, 0, 0), 0, 16)
      break
    case "On":
      for (index = 0; index < 16; index++) {
        currentColorSet[index] = definedColorSet[index]
      }
      break
    case "Rotate":
      ledCurrent = (ledCurrent + 1) % numberOfLeds;
      for (ledIndex = 0; ledIndex < 16; ledIndex++) {
        var colorIndex = (ledCurrent + ledIndex) % numberOfLeds;
        currentColorSet[ledIndex] = definedColorSet[colorIndex]
      }
      break
    case "Blink":
      if (ledBlinkState) {
        for (index = 0; index < 16; index++) {
          currentColorSet[index] = definedColorSet[index]
        }
        ledBlinkState = false
      }
      else {
        currentColorSet.fill(colorCombine(0, 0, 0), 0, 16)
        ledBlinkState = true
      }
      break
  }
}

/* --- Processing functions ---------------------------------- */

function reportUrl() {
  var link = 'http://' + ip.address() + ':3000';
  var url = 'https://buildflag-hub.herokuapp.com/api/updateTarget?name=' + os.hostname() + '&link=' + link
  var req = client.post(url, function (data, response) {
    console.log(url)
  })
  req.on('error', function (err) {
    console.log('reportUrl error', err);
  });
}

function processLeds() {
  try {
    setLeds(currentLedFunction)
    ws281x.render(currentColorSet)
  } catch (error) {
    console.log("Crashed in processLeds", error)
  }
}

function setColors(start, size, colors) {
  for (var index = 0; index < size; index++) {
    definedColorSet[start + index] = colors[index]
  }
}

/* --- Rest api ---------------------------------- */

// Get status, leds function
app.get('/getStatus', function (req, res) {
  res.json({
    hostName: os.hostname(),
    neoPixelFunction: getLedFunctionEnumString(currentLedFunction)
  })
})

// Set neopixel function, function: Off, On, Rotate, Blink
app.get('/setneopixel/function/:function', function (req, res) {
  var functionValue = parseLedFunctionEnum(req.params.function);
  currentLedFunction = functionValue;
  notifyChangedLedFunction();
  res.json('OK')
})

// Set neopixel colors
app.get('/setneopixel/colors/:colors', function (req, res) {
  var colors = parseRGBColorsString(req.params.colors);
  setColors(0, 16, colors);
  res.json('OK')
})

/* --- System setup and processing loop ---------------------------------- */

var signals = {
  'SIGINT': 2,
  'SIGTERM': 15
};

function shutdown(signal, value) {
  lightsOffLeds();
  process.nextTick(function () {
    process.exit(0);
  });
}

Object.keys(signals).forEach(function (signal) {
  process.on(signal, function () {
    shutdown(signal, signals[signal])
  });
});

// Main processing loop, runs 2Hz
const server = app.listen(app.get('port'), () => {
  console.log(`Find the server at: http://localhost:${app.get('port')}/`) // eslint-disable-line no-console
  reportUrl()
  setInterval(function () {
    processLeds()
  }, 500)
  setInterval(function () {
    reportUrl()
  }, 60 * 2000 * 10)
})

/* --- Client push setup and functions ---------------------------------- */

const io = require('socket.io')(server)

function notifyChangedLedFunction() {
  io.emit("led", {
    led: getLedFunctionEnumString(currentLedFunction),
  })
}
