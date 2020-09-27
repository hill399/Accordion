const fs = require('fs');
const path = require('path');

const AccordFundFactory = artifacts.require('AccordFundFactory')
const { LinkToken } = require('@chainlink/contracts/truffle/v0.4/LinkToken')
const { Oracle } = require('@chainlink/contracts/truffle/v0.6/Oracle')

module.exports = async (deployer, network, [defaultAccount]) => {
  // Local (development) networks need their own deployment of the LINK
  // token and the Oracle contract
  if (!network.startsWith('live')) {
    LinkToken.setProvider(deployer.provider)
    Oracle.setProvider(deployer.provider)
    try {
      await deployer.deploy(LinkToken, { from: defaultAccount })
      await deployer.deploy(Oracle, LinkToken.address, { from: defaultAccount })
      await deployer.deploy(AccordFundFactory, LinkToken.address)
    } catch (err) {
      console.error(err)
    }
  } else {
    // For live networks, use the 0 address to allow the ChainlinkRegistry
    // contract automatically retrieve the correct address for you
    deployer.deploy(AccordFundFactory, '0x0000000000000000000000000000000000000000')
  }

  const addrFile = path.join(__dirname, '..', 'build', 'addrs.env');
  try {
    fs.unlinkSync(addrFile);
  } catch {
    // delete if exists; ignore errors
  }

  fs.writeFileSync(addrFile, `LINK_CONTRACT_ADDRESS=${LinkToken.address}\nORACLE_CONTRACT_ADDRESS=${Oracle.address}\n`);
}
