import React, { Component } from 'react';
import logo from './logo.svg';
import {getFlagPosition} from './Service';

import './App.css';

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

  render() {
    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Welcome to React</h2>
        </div>
        <p className="App-intro">
          Flag position {this.state.flagPosition.position} as you see.
        </p>
      </div>
    );
  }
}

export default App;
