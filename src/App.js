import React, { Component } from 'react';
import Slider from 'react-rangeslider'
import { getFlagPosition, setFlagPosition } from './Service';

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
      nextPosition: 0
    }
  }

  componentDidMount() {
    socket.on('flagPosition', this.updateFlagPosition.bind(this));
    getFlagPosition().then((flagPosition) => {
      console.log("componentDidMount", flagPosition);
      this.setState({
        flagPosition,
        nextPosition: parseInt(flagPosition.next, 10)
      });
    });
  }

  updateFlagPosition(flagPosition) {
    console.log("updateFlagPosition", flagPosition);
    this.setState({
      flagPosition
    });
  }

  setPosition(e, position) {
    console.log("setPosition", position)
    setFlagPosition(position);
  }

  handleOnChange = (value) => {
    this.setState({
      nextPosition: value
    })
  }

  render() {
    let { nextPosition } = this.state
    return (
      <div className="App">
        <div className="App-header">
          <h2>Build Flag</h2>
        </div>
        <div className="App-intro">Current Flag position {this.state.flagPosition.current}.</div>
        <div className="App-intro">Next Flag position {this.state.flagPosition.next}.</div>
        <button onClick={e => this.setPosition(e, this.state.nextPosition)}>Press me</button>
        <Slider width="100%"
          value={nextPosition}
          onChange={this.handleOnChange}
        />
      </div>
    );
  }
}

export default App;
