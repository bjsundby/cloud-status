import 'whatwg-fetch';

const options = {
  credentials: 'same-origin',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
};

export function getStatus() {
  return fetch('/getStatus', options)
    .then(response => response.json());
}

export function setFlagPosition(position) {
  var url = '/setflag/' + position;
  return fetch(url, options)
    .then(response => response.json());
}

export function setRgbLedFunction(rgbLedFunction) {
  var url = '/setrgbled/function/' + rgbLedFunction;
  return fetch(url, options)
    .then(response => response.json());
}

export function setNeoPixelFunction(neoPixelFunction) {
  var url = '/setneopixel/function/' + neoPixelFunction;
  return fetch(url, options)
    .then(response => response.json());
}

export function setRgbLedColors(colors) {
  var url = '/setrgbled/colors/' + colors;
  return fetch(url, options)
    .then(response => response.json());
}

export function setNeoPixelColors(colors) {
  var url = '/setneopixel/colors/' + colors;
  return fetch(url, options)
    .then(response => response.json());
}
