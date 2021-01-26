
import React, { useState, useEffect } from "react"
import { Card, Input, Text, Button, Form, Flex, Box, Modal, Heading } from 'rimble-ui';
import axios, { post } from 'axios';
import { utils } from 'web3';

import '../layout/App.css'

import AccordFund from '../contracts/AccordFund.json';

const Upload = (props) => {

    const { drizzle, drizzleState, setFundAddress } = props
    const { AccordFundFactory } = drizzleState.contracts

    const [fileState, setFileState] = useState(null);

    const [deployState, setDeployState] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [newContractStack, setNewContractStack] = useState(null);

    const [deployKey, setDeployKey] = useState(null);
    const [addressState, setAddressState] = useState(null);

    const [isOpen, setIsOpen] = useState(false);

    const closeModal = e => {
        e.preventDefault();
        setIsOpen(false);
    };

    const openModal = e => {
        e.preventDefault();
        setIsOpen(true);
    };

    const fundContract = AccordFundFactory.contracts[deployKey];

    // Update Balances
    useEffect(() => {

        if (deployState && deployState.accId) {
            const fundFactory = drizzle.contracts.AccordFundFactory;
            const fundKey = fundFactory.methods.contracts.cacheCall(deployState.accId);

            setDeployKey(fundKey);
        }

    }, [deployState])

    const Hash = () => {
        // get the transaction states from the drizzle state
        const { transactions, transactionStack } = drizzleState

        // get the transaction hash using our saved `stackId`
        const txHash = transactionStack[newContractStack]

        if (fundContract && fundContract.value != '0x0000000000000000000000000000000000000000' && transactions[txHash] && transactions[txHash].status === "success") {

            console.log('setting address')
            console.log(fundContract.value)

            let contractConfig = {
                contractName: AccordFund.contractName,
                web3Contract: new drizzle.web3.eth.Contract(AccordFund.abi, fundContract.value)
            }

            let events = []
            drizzle.addContract(contractConfig, events);

            delete transactions[txHash];
        }

        return (
            <Text> TX Status: {transactions[txHash] && transactions[txHash].status} </Text>
        )
    }


    const setExistingFundContract = (e, address) => {

        e.preventDefault();

        if (fundContract && fundContract.value) {
            address = fundContract.value;
        }

        if (address != null) {
            let contractConfig = {
                contractName: AccordFund.contractName,
                web3Contract: new drizzle.web3.eth.Contract(AccordFund.abi, address)
            }

            let events = []
            drizzle.addContract(contractConfig, events);
            setFundAddress(address);
        }
    }


    const handleFileInput = (e) => {
        setFileState(e.target.files[0]);
    }

    const handleTextInput = (e) => {
        setAddressState(e.target.value);
    }


    const uploadContract = (e) => {
        e.preventDefault();
        const url = 'https://cors-anywhere.herokuapp.com/' + process.env.REACT_APP_UPLOAD_CTA;

        if (fileState != null) {
            const formData = new FormData();
            formData.append('file', fileState);

            const config = {
                headers: {
                    'content-type': 'multipart/form-data',
                    'accept': 'multipart/form-data',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'DELETE, POST, GET, OPTIONS'
                }
            };

            post(url, formData, config).then(response => {
                const data = response.data.result;
                setDeployState(data);
                setShowDetails(true);
            })

            console.log('uploading file...')

            setIsOpen(false);
        }
    }

    const newAccordFund = () => {

        const contract = drizzle.contracts.AccordFundFactory;

        if (deployState) {

            const depositWei = utils.toWei(String(deployState.deposit), 'ether');
            const payoutWei = utils.toWei(String(deployState.payout), 'ether');

            const newContractStack = contract.methods["newAccordFundContract"].cacheSend(deployState.insurerAddr,
                deployState.clientAddr,
                payoutWei,
                depositWei,
                deployState.start,
                deployState.end,
                deployState.accId, {
                from: drizzleState.accounts[0],
                gas: 4000000
            })

            setNewContractStack(newContractStack);
        };
    }

    const ContractDetails = () => {
        return (
            <div >
                <Text fontWeight={"Bold"}> Contract Variables </Text>
                <Text> ID: {deployState.accId} </Text>
                <Text> Insurer: {deployState.insurerName} ({deployState.insurerAddr}) </Text>
                <Text> Client: {deployState.clientName} ({deployState.clientAddr}) </Text>
                <Text> Location : {deployState.locLat}, {deployState.locLon} </Text>
                <Text> Insurer Deposit: {deployState.payout} </Text>
                <Text> Client Deposit: {deployState.deposit} </Text>
            </div>
        )
    }

    const DeployContract = () => {
        return (
            <Button style={{ marginTop: '15px' }} onClick={newAccordFund}> Deploy Funding Contract</Button>
        )
    }

    return (
        <div style={{ marginTop: '10px' }}>
            <Form onSubmit={(e) => { setExistingFundContract(e, addressState) }}>
                <Input placeholder="0x.." type="text" onChange={handleTextInput} />
                <Button type="submit">Load</Button>
                <Text.p />
            </Form>
            <Text fontWeight={"bold"}> OR </Text>
            <Button style={{ marginTop: '10px' }} onClick={openModal}> Upload </Button>

            <Modal isOpen={isOpen}>
                <Card width={"420px"} p={0}>
                    <Button.Text
                        icononly
                        icon={"Close"}
                        color={"moon-gray"}
                        position={"absolute"}
                        top={0}
                        right={0}
                        mt={3}
                        mr={3}
                        onClick={closeModal}
                    />

                    <Box p={4} mb={1}>
                        <Heading.h3>Upload Archive</Heading.h3>
                        <Text> Upload an Accord Contract Archive (*.cta)</Text>
                    </Box>

                    <Flex
                        px={4}
                        py={2}
                        borderTop={1}
                        borderColor={"#E8E8E8"}
                        justifyContent={"flex-end"}
                    >
                        <Form onSubmit={uploadContract}>
                            <Flex>
                                <Input type="file" onChange={handleFileInput} />
                                <Button style={{ marginLeft: '20px' }} type="submit">Upload</Button>
                            </Flex>
                        </Form>
                    </Flex>
                </Card>
            </Modal>
            <div style={{ marginTop: '20px' }}>
                {(showDetails && deployState) ? <ContractDetails /> : null}
                {(showDetails && deployState) ? <DeployContract /> : null}
                {(showDetails && deployState) ? Hash() : null}
            </div>
        </div>
    )
}

export default Upload;
