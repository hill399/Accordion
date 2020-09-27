# Accordion
## Smart Legal Contracts on Chainlink
## Chainlink Hackathon 2020

Smart legal contracts on Chainlink. Implements the Accord Projects cicero engine as an external adapter, paired with smart contracts for automated payment to involved parties.

## What it does

In it's current state, Accordion is able to take an legal contract archive (*.cta) of a fixed design and initiate on a Chainlink node. The smart contract on Ethereum then handles initial user deposits - in this instance insurer/client - before initialising the contract for use. Once running, the smart contract can be triggered by either of the parties to assess the legal clause against a given input.

In this example the contract is an weather insurance agreement between two parties. A premium and payout is defined in the legal contract, along with the location to be monitored. The deployment flow is as follows:

1. The legal contract is developed and exported as a (*.cta) file. This file is then upload to the Accordion app.
2. Once uploaded, the user will verify the contract details and when happy will deploy the payment contract via a factory contract.
3. With the payment contract deployed, the client and insurer must deposit the specified payment in ETH.
4. The contract can then be initialised on the Chainlink node via the Accord Cicero engine.
5. When successful, both the client and insurer can trigger the contract to assess it's status at a given time. 


## How I built it
### External Adapter
An adapter had to be built in order to deploy the Cicero engine on a Chainlink node. This adapter handles both intialisation and execution of contact input. This was build from the NodeJS adapter template.

### Cloud Functions & Storage
A cloud function was built to upload the legal archives from the front-end to a cloud storage bucket.

### Smart Contracts
A factory contract was developed for this specific legal archive so that a known, fixed triggering mechanism would be available if many contract's were to be deployed. The payment template contract derived from this, stores data on the current payment state, as well as the logic to trigger the Chainlink oracle contract.

### Drizzle Front-End
Truffle's Drizzle framework was used to develop a front-end to tie all of the above functionality together.

## Next Steps
1. Get a more robust front-end operational. Currently extremely bare-bones and offers basic functionality. 
2. Find a more reliable way to hash data on-chain to gaurantee contract state.
3. Generalise the Accord function format - look to create a model library aimed a Ethereum use (i.e. fixed format contract responses for wider use).



