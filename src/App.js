import React, { Component } from 'react';
import Slider from 'react-rangeslider'
import { getFlagPosition, setFlagPosition, getRgbLedsFunction, setRgbLedsFunction } from './Service';

import './App.css';

import 'react-rangeslider/lib/index.css'

let io = require('socket.io-client');
let socket = io();

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      flagPosition: {
        current: 0,
        next: 0
      },
      nextPosition: 0,
      rgbLedsFunction: 'Off'
    }
  }

  componentDidMount() {
    socket.on('flagPosition', this.updateFlagPosition.bind(this));

    Promise.all([
      getFlagPosition(),
      getRgbLedsFunction()
    ]).then((values) => {
      this.setState({
        flagPosition: values[0],
        nextPosition: parseInt(this.state.flagPosition.next, 10),
        rgbLedsFunction: values[1].function
      });
    })
  }

  updateFlagPosition(flagPosition) {
    console.log("updateFlagPosition", flagPosition);
    this.setState({
      flagPosition
    });
  }

  setFlagPosition(e, position) {
    console.log("setPosition", position)
    setFlagPosition(position);
  }

  handleOnChange = (value) => {
    this.setState({
      nextPosition: value
    })
  }

  handleRgbLedsFunctionChange = (changeEvent) => {
    this.setState({
      rgbLedsFunction: changeEvent.target.value
    });
  }

  setRgbLedsFunction(e, rgbLedsFunction) {
    console.log("setRgbLedsFunction", rgbLedsFunction)
    setRgbLedsFunction(rgbLedsFunction);
  }

  render() {
    let { nextPosition } = this.state
    return (
      <div className="App">
        <div className="App-header">
          <h2>Build Flag</h2>
        </div>
        <div className="Information">Current Flag position: {this.state.flagPosition.current}.</div>
        <div className="Information">Next Flag position: {this.state.flagPosition.next}.</div>
        <Slider className="Slider" width="100%"
          value={nextPosition}
          onChange={this.handleOnChange}
        />
        <button onClick={e => this.setFlagPosition(e, this.state.nextPosition)}>Update Flag position</button>
        <div className="Information">RGB Leds function: {this.state.rgbLedsFunction}.</div>
        <form>
          <div className="radio">
            <label>
              <input type="radio" value="Off"
                checked={this.state.rgbLedsFunction === 'Off'}
                onChange={this.handleRgbLedsFunctionChange} />
              Off
            </label>
          </div>
          <div className="radio">
            <label>
              <input type="radio" value="On"
                checked={this.state.rgbLedsFunction === 'On'}
                onChange={this.handleRgbLedsFunctionChange} />
              On
            </label>
          </div>
          <div className="radio">
            <label>
              <input type="radio" value="Rotate"
                checked={this.state.rgbLedsFunction === 'Rotate'}
                onChange={this.handleRgbLedsFunctionChange} />
              Rotate
            </label>
          </div>
          <div className="radio">
            <label>
              <input type="radio" value="Blink"
                checked={this.state.rgbLedsFunction === 'Blink'}
                onChange={this.handleRgbLedsFunctionChange} />
              Blink
            </label>
          </div>
        </form>
        <button onClick={e => this.setRgbLedsFunction(e, this.state.rgbLedsFunction)}>Update RGB Leds function</button>

        <div className="Information">NeoPixels function: {this.state.rgbLedsFunction}.</div>
        <button>Update Neopixels function</button>
      </div>
    );
  }
}

export default App;
