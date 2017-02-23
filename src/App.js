import React, { Component } from 'react';
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
          <h2>Build Flag</h2>
        </div>
        <p className="App-intro">
          Flag position {this.state.flagPosition.position} as you see.
        </p>
      </div>
    );
  }
}

export default App;
