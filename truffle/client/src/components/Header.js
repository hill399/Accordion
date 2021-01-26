import React from "react";
import { Blockie, Text } from 'rimble-ui';

import '../layout/App.css'

const Header = (props) => {
  const { drizzleState } = props;

  const shortAccount = () => {
    const connAccount = drizzleState.accounts[0];
    return (
      connAccount.slice(0, 8) + "..." + connAccount.slice(36)
    )
  }

  return (
    <div style={{ marginTop: '10px' }}>
      <Text textAlign="right" fontSize={16}> Account: {shortAccount()} <Blockie opts={{ size: 7 }} /> </Text>
      <h1> Accordion </h1>
      <h3> Smart Legal Contracts on Chainlink</h3>
    </div>
  )
}

export default Header;

