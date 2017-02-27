import React, { Component } from 'react';
import Slider from 'react-rangeslider'
import { getStatus, setFlagPosition, setRgbLedFunction, setRgbLedColors } from './Service';

import './App.css';

import 'react-rangeslider/lib/index.css'

let io = require('socket.io-client');
let socket = io();

const colors = [0xFF0000, 0x00FF00, 0x0000FF];

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      flagPosition: {
        current: 0,
        next: 0
      },
      nextPosition: 0,
      rgbLedFunction: 'Off',
      neopixelFunction: 'Off'
    }
  }

  componentDidMount() {
    socket.on('flagPosition', this.updateFlagPosition.bind(this));

    getStatus().then((status) => {
      console.log("componentDidMount", status);
      this.setState({
        flagPosition: status.flagPosition,
        nextPosition: parseInt(status.flagPosition.next, 10),
        rgbLedFunction: status.rgbLedFunction,
        neopixelFunction: status.neopixelFunction
      });
    });

    setRgbLedColors(colors);
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

  handleRgbLedFunctionChange = (changeEvent) => {
    this.setState({
      rgbLedFunction: changeEvent.target.value
    });
  }

  setRgbLedFunction(e, rgbLedFunction) {
    console.log("setRgbLedFunction", rgbLedFunction)
    setRgbLedFunction(rgbLedFunction);
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
        <div className="Information">RGB Led function: {this.state.rgbLedFunction}.</div>
        <form>
          <div className="radio">
            <label>
              <input type="radio" value="Off"
                checked={this.state.rgbLedFunction === 'Off'}
                onChange={this.handleRgbLedFunctionChange} />
              Off
            </label>
          </div>
          <div className="radio">
            <label>
              <input type="radio" value="On"
                checked={this.state.rgbLedFunction === 'On'}
                onChange={this.handleRgbLedFunctionChange} />
              On
            </label>
          </div>
          <div className="radio">
            <label>
              <input type="radio" value="Rotate"
                checked={this.state.rgbLedFunction === 'Rotate'}
                onChange={this.handleRgbLedFunctionChange} />
              Rotate
            </label>
          </div>
          <div className="radio">
            <label>
              <input type="radio" value="Blink"
                checked={this.state.rgbLedFunction === 'Blink'}
                onChange={this.handleRgbLedFunctionChange} />
              Blink
            </label>
          </div>
        </form>
        <button onClick={e => this.setRgbLedFunction(e, this.state.rgbLedFunction)}>Update RGB Led function</button>

      </div>
    );
  }
}

export default App;
