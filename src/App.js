import React, { Component } from 'react';
import Slider from 'react-rangeslider'
import { getStatus, setFlagPosition, setRgbLedFunction, setNeoPixelFunction, setRgbLedColors, setNeoPixelColors } from './Service';

import './App.css';

import 'react-rangeslider/lib/index.css'

let io = require('socket.io-client');
let socket = io();

const rgbLedColors = [0xFF0000, 0x00FF00, 0x0000FF];
const neoPixelColors = [
  0xFF0000, 0x00FF00, 0x0000FF, 0xFF0000, 0x00FF00,
  0x0000FF, 0xFF0000, 0x00FF00, 0x0000FF, 0xFF0000,
  0x00FF00, 0x0000FF, 0xFF0000, 0x00FF00, 0x0000FF
];

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
      neoPixelFunction: 'Off'
    }
  }

  componentDidMount() {
    socket.on('flagPosition', this.updateFlagPosition.bind(this));
    socket.on('rgbLedFunction', this.updateRgbledFunction.bind(this));
    socket.on('neoPixelFunction', this.updateNeoPixelFunction.bind(this));

    getStatus().then((status) => {
      this.setState({
        flagPosition: status.flagPosition,
        nextPosition: parseInt(status.flagPosition.next, 10),
        rgbLedFunction: status.rgbLedFunction,
        neoPixelFunction: status.neoPixelFunction
      });
    });

    setRgbLedColors(rgbLedColors);
    setNeoPixelColors(neoPixelColors);
  }

  updateFlagPosition(flagPosition) {
    this.setState({
      flagPosition
    });
  }

  updateRgbledFunction(rgbLedFunction) {
    this.setState(
      rgbLedFunction
    );
  }

  updateNeoPixelFunction(neoPixelFunction) {
    this.setState(
      neoPixelFunction
    );
  }

  setFlagPosition(e, position) {
    setFlagPosition(position);
  }

  handleOnChange = (value) => {
    this.setState({
      nextPosition: value
    })
  }

  handleRgbLedFunctionChange = (changeEvent) => {
    console.log("handleRgbLedFunctionChange: ", changeEvent.target.value)
    this.setState({
      rgbLedFunction: changeEvent.target.value
    });
  }

  setRgbLedFunction(e, rgbLedFunction) {
    setRgbLedFunction(rgbLedFunction);
  }

  handleNeoPixelFunctionChange = (changeEvent) => {
    console.log("handleNeoPixelFunctionChange: ", changeEvent.target.value)
    this.setState({
      neoPixelFunction: changeEvent.target.value
    });
  }

  setNeoPixelFunction(e, neoPixelFunction) {
    setNeoPixelFunction(neoPixelFunction);
  }

  render() {
    let { nextPosition } = this.state
    return (
      <div className="App">
        <div className="App-header">
          <h2>Visual Status Device</h2>
        </div>
        <div className="FlagContainer">
          <div className="Container">
            <div className="Information">Current Flag position: {this.state.flagPosition.current}.</div>
            <div className="Information">Next Flag position: {this.state.flagPosition.next}.</div>
          </div>
          <Slider className="Slider" width="100%"
            value={nextPosition}
            onChange={this.handleOnChange}
          />
          <button onClick={e => this.setFlagPosition(e, this.state.nextPosition)}>Set Flag position</button>
        </div>
        <div className="RgbLedContainer">
          <div className="Information">RGB Led function: {this.state.rgbLedFunction}.</div>
          <form className="SelectionForm">
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
          <button onClick={e => this.setRgbLedFunction(e, this.state.rgbLedFunction)}>Set RGB Led function</button>
        </div>
        <div className="Information">Neo Pixel function: {this.state.neoPixelFunction}.</div>
        <form>
          <div className="radio">
            <label>
              <input type="radio" value="Off"
                checked={this.state.neoPixelFunction === 'Off'}
                onChange={this.handleNeoPixelFunctionChange} />
              Off
            </label>
          </div>
          <div className="radio">
            <label>
              <input type="radio" value="On"
                checked={this.state.neoPixelFunction === 'On'}
                onChange={this.handleNeoPixelFunctionChange} />
              On
            </label>
          </div>
          <div className="radio">
            <label>
              <input type="radio" value="Rotate"
                checked={this.state.neoPixelFunction === 'Rotate'}
                onChange={this.handleNeoPixelFunctionChange} />
              Rotate
            </label>
          </div>
          <div className="radio">
            <label>
              <input type="radio" value="Blink"
                checked={this.state.neoPixelFunction === 'Blink'}
                onChange={this.handleNeoPixelFunctionChange} />
              Blink
            </label>
          </div>
        </form>
        <button onClick={e => this.setNeoPixelFunction(e, this.state.neoPixelFunction)}>Set Neo Pixel function</button>
      </div>
    );
  }
}

export default App;
