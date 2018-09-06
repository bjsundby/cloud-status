import React, { Component } from 'react'
import Slider from 'react-rangeslider'
import { getStatus,  setledFunction } from './Service'

import './App.css'

let io = require('socket.io-client')
let socket = io()

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      hostName: "",
      ed: 'Off'
    }
  }

  componentDidMount() {
    socket.on('led', this.updateledFunction.bind(this))

    getStatus().then((status) => {
      this.setState({
        hostName: status.hostName,
        led: status.neoPixelFunction
      })
    })
  }

  updateledFunction(ledFunction) {
    this.setState({
      led: ledFunction
    })
  }

  handleLedFunctionChange = (changeEvent) => {
    this.setState({
      led: changeEvent.target.value
    });
  }

  setLedFunction(e, ledFunction) {
    setLedFunction(ledFunction)
  }

  render() {
    return (
      <div className="App">
        <div className="App-header">
          <h2>{this.state.hostName}</h2>
        </div>
        <div className="LedContainer">
          <div className="Information">Led function: {this.state.led}.</div>
          <form className="Form">
            <div className="radio">
              <label>
                <input type="radio" value="Off"
                  checked={this.state.led === 'Off'}
                  onChange={this.handleLedFunctionChange} />
                Off
            </label>
            </div>
            <div className="radio">
              <label>
                <input type="radio" value="On"
                  checked={this.state.led === 'On'}
                  onChange={this.handleLedFunctionChange} />
                On
            </label>
            </div>
            <div className="radio">
              <label>
                <input type="radio" value="Rotate"
                  checked={this.state.led === 'Rotate'}
                  onChange={this.handleLedFunctionChange} />
                Rotate
            </label>
            </div>
            <div className="radio">
              <label>
                <input type="radio" value="Blink"
                  checked={this.state.led === 'Blink'}
                  onChange={this.handleLedFunctionChange} />
                Blink
            </label>
            </div>
          </form>
          <button onClick={e => this.setLedFunction(e, this.state.led)}>Set Led function</button>
        </div>
      </div>
    );
  }
}

export default App;
