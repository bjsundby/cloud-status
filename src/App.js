import React, { Component } from 'react';
import {getFlagPosition,setFlagPosition} from './Service';

import './App.css';

const io = require('socket.io-client')  

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      flagPosition: {
        position: 0
      }
    }
  }

  componentDidMount() {
    getFlagPosition().then((flagPosition) => {
      this.setState({
        flagPosition
      });
    });

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
        <p className="App-intro">
          Flag position {this.state.flagPosition.position} as you see.
        </p>
        <button onClick={e => this.setPosition(e, 50)}>Press me</button>
        <button>Hei</button>
      </div>
    );
  }
}

export default App;
