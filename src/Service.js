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

export function setLedFunction(ledFunction) {
  var url = '/setneopixel/function/' + ledFunction;
  return fetch(url, options)
    .then(response => response.json());
}

