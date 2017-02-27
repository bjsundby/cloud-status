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
