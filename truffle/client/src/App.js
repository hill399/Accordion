import React, { useState } from "react";
import { DrizzleContext } from "drizzle-react";
import Header from './components/Header';
import Upload from './components/Upload';
import Fund from './components/Fund';
import Trigger from './components/Trigger';

import { Text } from 'rimble-ui';
import "./layout/App.css";
import git_icon from './icons/GitHub-Mark-32px.png';

const App = () => {
  const [fundAddress, setFundAddress] = useState(null);
  const [accordState, setAccordState] = useState(null);

  const PresentAccordState = () => {
    switch (accordState) {
      case true:
        return (
          <Text> Accord Contract is active</Text>
        )

      case false:
        return (
          <Text> Accord Contract has closed</Text>
        )

      default:
        return (
          <Text> Accord Contract has not been initialized</Text>
        )
    }
  }

  return (
    <DrizzleContext.Consumer>
      {drizzleContext => {
        const { drizzle, initialized, drizzleState } = drizzleContext;

        if (!initialized) {
          return "Loading, Web3 initialising...";
        }

        return (
          <div className="App" style={{ overflow: "hidden" }}>
            <Header drizzleState={drizzleState} />
            <PresentAccordState />
            { typeof (drizzle.contracts.AccordFund) === 'undefined' ? <Upload drizzle={drizzle} drizzleState={drizzleState} setFundAddress={setFundAddress} /> : null}
            { typeof (drizzle.contracts.AccordFund) !== 'undefined' && accordState !== true ? <Fund drizzle={drizzle} drizzleState={drizzleState} setAccordState={setAccordState} /> : null}
            { accordState === true ? <Trigger drizzle={drizzle} drizzleState={drizzleState} /> : null}
            <img src={git_icon} id="gitIcon" alt="git-icon" style={{ cursor: "pointer", marginTop: '100px' }} onClick={() => window.open('http://github.com/hill399/Accordion')} />
          </div>
        );
      }}
    </DrizzleContext.Consumer>
  )
}

export default App;