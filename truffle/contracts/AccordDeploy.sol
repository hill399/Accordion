pragma solidity 0.5.10;

import "@chainlink/contracts/src/v0.5/ChainlinkClient.sol";
import "../oz-25/contracts/ownership/Ownable.sol";

contract AccordFundFactory {

    mapping (string => address) public contracts;

    address public linkAddress;

    constructor(address _link) public {
        linkAddress = _link;
    }

    function newAccordFundContract(
        address payable _iAddr,
        address payable _cAddr,
        uint256 _payout,
        uint256 _deposit,
        string memory _start,
        string memory _end,
        string memory _id
    ) public returns (address) {
        AccordFund ac = new AccordFund(
            linkAddress,
            _iAddr,
            _cAddr,
            _payout,
            _deposit,
            _start,
            _end,
            _id
        );
        
        contracts[_id] = address(ac);
        
        return address(ac);
    }
}

/**
 * @title MyContract is an example contract which requests data from
 * the Chainlink network
 * @dev This contract is designed to work on multiple networks, including
 * local test networks
 */
contract AccordFund is ChainlinkClient {
    address payable public iAddr;
    address payable public cAddr;

    uint256 public payout;
    uint256 public deposit;

    string start;
    string end;

    string public id;

    bool public deployed;
    
    address public lastAddr;
    
    bytes8 public hash;

    mapping(address => uint256) public balances;
    bytes8[] public stateHash;

    /**
     * @notice Deploy the contract with a specified address for the LINK
     * and Oracle contract addresses
     * @dev Sets the storage for the specified addresses
     * @param _link The address of the LINK token contract
     */
    constructor(
        address _link,
        address payable _iAddr,
        address payable _cAddr,
        uint256 _payout,
        uint256 _deposit,
        string memory _start,
        string memory _end,
        string memory _id
    ) public {
        if (_link == address(0)) {
            setPublicChainlinkToken();
        } else {
            setChainlinkToken(_link);
        }

        iAddr = _iAddr;
        cAddr = _cAddr;
        payout = _payout;
        deposit = _deposit;
        start = _start;
        end = _end;
        id = _id;

        deployed = false;
        lastAddr = address(0);
    }

    modifier onlyLegalAddresses() {
        require(msg.sender == iAddr || msg.sender == cAddr);
        _;
    }

    modifier partyValueSubmitted() {
        require(balances[iAddr] >= payout && balances[cAddr] >= deposit);
        _;
    }

    // DEV FUNCTION TO ADD CORRECT FUNDS
    function devAddCorrectFunds() public {
        balances[iAddr] = payout;
        balances[cAddr] = deposit;
    }

    /**
     * @notice Returns the address of the LINK token
     * @dev This is the public implementation for chainlinkTokenAddress, which is
     * an internal method of the ChainlinkClient contract
     */
    function getChainlinkToken() public view returns (address) {
        return chainlinkTokenAddress();
    }

    // Add deposit function for insurer, client
    function depositFunds()
    public
    payable
    onlyLegalAddresses
    {
        if (msg.sender == iAddr){
            require(msg.value == payout, "Incorrect insurer deposit");
            balances[iAddr] = msg.value;
        } else if (msg.sender == cAddr){
            require(msg.value == deposit, "Incorrect client deposit");
            balances[cAddr] = msg.value;
        }
    }

    function deployAccordContract(
        address _oracle,
        string memory _jobId,
        uint256 _payment
    )
        public
        //onlyOwner
        returns (
            //onlyLegalAddresses
            //partyValueSubmitted
            bytes32 requestId
        )
    {
        Chainlink.Request memory req = buildChainlinkRequest(
            stringToBytes32(_jobId),
            address(this),
            this.fulfillDeployment.selector
        );

        req.add("id", id);
        req.add("func", "deploy");
        req.add("insurer", toString(abi.encodePacked(iAddr)));
        req.add("client", toString(abi.encodePacked(cAddr)));
        req.add("deposit", toString(abi.encodePacked(deposit)));
        req.add("payout",toString(abi.encodePacked(payout)));
        requestId = sendChainlinkRequestTo(_oracle, req, _payment);
    }
    
    

    function fulfillDeployment(bytes32 _requestId, bytes32 _data)
        public
        recordChainlinkFulfillment(_requestId)
    {
        bytes8 pass = 0xffffffffffffffff;
        
        uint256 rr = uint256(_data);
        hash = bytes8(uint64(rr >> 64*0));
        
        if (hash == pass){
            deployed = true;
            _writeToHashMap(_data);
        }
    }
    
    
    function triggerAccordContract(
    address _oracle,
    string memory _jobId,
    uint256 _payment
    )
    public
    onlyLegalAddresses
    partyValueSubmitted
    returns (
        bytes32 requestId
    )
    {
        Chainlink.Request memory req = buildChainlinkRequest(
            stringToBytes32(_jobId),
            address(this),
            this.fulfillTrigger.selector
        );

        req.add("id", id);
        req.add("func", "trigger");
        requestId = sendChainlinkRequestTo(_oracle, req, _payment);
    }


    function fulfillTrigger(bytes32 _requestId, bytes32 _payoutAddress)
        public
        recordChainlinkFulfillment(_requestId)
    {
        
        address pa = address(uint160(uint256(_payoutAddress)));
        lastAddr = pa;
        
        if (pa == iAddr){
            //iAddr.transfer(payout);
            payout = 0;
        } else if (pa == cAddr){
            //cAddr.transfer(payout);
            payout = 0;
        }
        
        _writeToHashMap(_payoutAddress);
    }
    
    function _writeToHashMap(bytes32 _input)
    internal
    {
        uint256 rr = uint256(_input);
        hash = bytes8(uint64(rr >> 64*3));
        stateHash.push(hash);
    }

    /**
     * @notice Allows the owner to withdraw any LINK balance on the contract
     */
    function withdrawLink()
        public
       // onlyOwner /*onlyLegalAddresses*/
    {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(
            link.transfer(msg.sender, link.balanceOf(address(this))),
            "Unable to transfer"
        );
    }

    /**
     * @notice Call this method if no response is received within 5 minutes
     * @param _requestId The ID that was generated for the request to cancel
     * @param _payment The payment specified for the request to cancel
     * @param _callbackFunctionId The bytes4 callback function ID specified for
     * the request to cancel
     * @param _expiration The expiration generated for the request to cancel
     */
    function cancelRequest(
        bytes32 _requestId,
        uint256 _payment,
        bytes4 _callbackFunctionId,
        uint256 _expiration
    )
        public
        onlyLegalAddresses
    {
        cancelChainlinkRequest(
            _requestId,
            _payment,
            _callbackFunctionId,
            _expiration
        );
    }


    function toString(bytes memory data) public pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < data.length; i++) {
            str[2 + i * 2] = alphabet[uint256(uint8(data[i] >> 4))];
            str[3 + i * 2] = alphabet[uint256(uint8(data[i] & 0x0f))];
        }
        return string(str);
    }

    function stringToBytes32(string memory source)
        private
        pure
        returns (bytes32 result)
    {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            // solhint-disable-line no-inline-assembly
            result := mload(add(source, 32))
        }
    }
}
