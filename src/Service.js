import 'whatwg-fetch';

const options = {
  credentials: 'same-origin',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
};

export function getFlagPosition() {
  return fetch('/getflag', options)
    .then(response => response.json());
}

export function setFlagPosition(position) {
  var url = '/setflag/' + position;
  return fetch(url, options)
    .then(response => response.json());
}
