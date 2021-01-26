
import React from "react"
import { Button } from 'rimble-ui';

import '../layout/App.css'

const Trigger = (props) => {

    const { drizzle, drizzleState } = props

    const triggerAccord = () => {
        const contract = drizzle.contracts.AccordFund;

        const depositStack = contract.methods["triggerAccordContract"].cacheSend('0x8dEC8160A40D671a76C67EB7BB2d84D012040B82',
            "0edabe00f0d64187bb26fc155e6f9523",
            0, {
            from: drizzleState.accounts[0],
            gas: 1000000
        })
    }

    return (
        <div style={{ marginTop: '10px' }}>
            <Button onClick={triggerAccord}> Trigger Accord Contract </Button>
        </div>
    )
}

export default Trigger;
