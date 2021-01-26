import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import Web3 from "web3";

import { Drizzle, generateStore } from "drizzle";
import { DrizzleContext } from "drizzle-react";

import LinkTokenInterface from "./contracts/LinkTokenInterface.json"
import AccordFundFactory from "./contracts/AccordFundFactory.json";

// process.env.REACT_APP_INFURA_KEY
const web3 = new Web3(Web3.givenProvider);

const options = {
  web3: {
    customProvider: web3,
  },
  alwaysSync: true,
  contracts: [
    {
      contractName: LinkTokenInterface.contractName,
      web3Contract: new web3.eth.Contract(LinkTokenInterface.abi, '0x20fe562d797a42dcb3399062ae9546cd06f63280')
    },
    {
      contractName: AccordFundFactory.contractName,
      web3Contract: new web3.eth.Contract(AccordFundFactory.abi, '0x7F1175EC82E380d00ef18EA8183e1a7507e8BdC2')
    }],
  polls: {
    accounts: 5000,
    blocks: 8000,
  },
  events: {},
  networkWhitelist: [3],
};

const drizzleStore = generateStore(options);

const drizzle = new Drizzle(options, drizzleStore);

if (module.hot && process.env.NODE_ENV !== 'production') {
  module.hot.accept();
}

ReactDOM.render(
  <DrizzleContext.Provider drizzle={drizzle}>
    <App />
  </DrizzleContext.Provider>,
  document.getElementById('root'));
