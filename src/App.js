import React, { Component } from 'react';
import {getFlagPosition,setFlagPosition} from './Service';

import './App.css';

let io = require('socket.io-client');
let socket = io();

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      flagPosition: {
        current: 0,
        next: 0
      }
    }
  }

  

  componentDidMount() {
    socket.on('flagPosition', this.updateFlagPosition.bind(this));
    getFlagPosition().then((flagPosition) => {
      this.setState({
        flagPosition
      });
    });

  }

  updateFlagPosition(flagPosition) {
    this.setState({flagPosition});
  }

  setPosition(e, position) {
    setFlagPosition(position);
  }

  render() {
    return (
      <div className="App">
        <div className="App-header">
          <h2>Build Flag</h2>
        </div>
        <div className="App-intro">Current Flag position {this.state.flagPosition.current}.</div>
        <div className="App-intro">Next Flag position {this.state.flagPosition.next}.</div>
        <button onClick={e => this.setPosition(e, 50)}>Press me</button>
        <button>Hei</button>
      </div>
    );
  }
}

export default App;
