
import React, { useState, useEffect } from "react"
import { Text, Button } from 'rimble-ui';
import { utils } from 'web3';

import '../layout/App.css'

const Fund = (props) => {

    const { drizzle, drizzleState, setAccordState } = props
    const { AccordFund } = drizzleState.contracts

    let clientAddress, insurerAddress, clientBal, insurerBal, accordState;

    const [depositKey, setDepositKey] = useState({
        client: null,
        insurer: null
    });

    const [addressKey, setAddressKey] = useState({
        client: null,
        insurer: null
    });

    const [accordKey, setAccordKey] = useState(null);

    const [depositStack, setDepositStack] = useState(null);

    // Update Balances
    useEffect(() => {

        const fundContract = drizzle.contracts.AccordFund;
        const clientKey = fundContract.methods.cAddr.cacheCall()
        const insurerKey = fundContract.methods.iAddr.cacheCall()

        setAddressKey({
            ...addressKey,
            client: clientKey,
            insurer: insurerKey
        })

        const clientDeposit = fundContract.methods.deposit.cacheCall();
        const insurerDeposit = fundContract.methods.payout.cacheCall();

        setDepositKey({
            ...depositKey,
            client: clientDeposit,
            insurer: insurerDeposit
        })

        const accordKey = fundContract.methods.deployed.cacheCall();
        setAccordKey(accordKey);



    }, [])


    insurerAddress = addressKey && AccordFund.iAddr[addressKey.insurer];
    clientAddress = addressKey && AccordFund.cAddr[addressKey.client];

    accordState = accordKey && AccordFund.deployed[accordKey];

    if (accordState && accordState.value) {
        setAccordState(accordState.value);
    }

    const depositFunds = (value) => {
        const contract = drizzle.contracts.AccordFund;

        const depositStack = contract.methods["depositFunds"].cacheSend({
            from: drizzleState.accounts[0],
            value: value,
            gas: 1000000
        })

        setDepositStack(depositStack);
    }

    const GetPartyState = () => {

        const insurerAddr = insurerAddress && insurerAddress.value;
        const clientAddr = clientAddress && clientAddress.value;

        switch (drizzleState.accounts[0]) {
            case clientAddr:
                return (
                    <div>
                        <Text fontWeight={"Bold"}> Connected as the Client </Text>
                        <Button style={{ marginTop: '10px' }} onClick={() => depositFunds(clientBal.value)}> Deposit </Button>
                        <Text fontWeight={"Italic"}> Deposit {clientBal && utils.fromWei(String(clientBal.value), 'ether')} ETH </Text>
                    </div>
                )

            case insurerAddr:
                return (
                    <div>
                        <Text fontWeight={"Bold"}> Connected as the Insurer </Text>
                        <Button style={{ marginTop: '10px' }} onClick={() => depositFunds(insurerBal.value)}> Deposit </Button>
                        <Text fontWeight={"Italic"}> Deposit {insurerBal && utils.fromWei(String(insurerBal.value), 'ether')} ETH </Text>
                    </div>
                )

            default:
                return (
                    <Text fontWeight={"Bold"}> Connected Address Unknown </Text>
                )
        }
    }

    const deployAccord = () => {
        const contract = drizzle.contracts.AccordFund;

        const depositStack = contract.methods["deployAccordContract"].cacheSend('0x8dEC8160A40D671a76C67EB7BB2d84D012040B82',
            "0edabe00f0d64187bb26fc155e6f9523",
            0, {
            from: drizzleState.accounts[0],
            gas: 1000000
        })
    }

    insurerBal = depositKey && AccordFund.payout[depositKey.insurer];
    clientBal = depositKey && AccordFund.deposit[depositKey.client];

    return (
        <div style={{ marginTop: '10px' }}>
            < GetPartyState />

            <Button style={{ marginTop: '50px' }} onClick={deployAccord}> Start Accord Contract </Button>
            <Text style={{ marginTop: '15px' }}> When both parties have deposited  </Text>
            <Text > start the Accord contract  </Text>
        </div>
    )
}

export default Fund;
