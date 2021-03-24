pragma solidity 0.8.1;

import "./BEP20.sol";

contract TinFitToken is BEP20 {

    address private _initialOwner;
    uint256 private _initialOwnerLockedTokenAmount;

    address private _liquidityPool;
    address private _distributionPool;

    uint256 private _taxMultiplicator = 100;

    mapping(address => bool) private _senderWhitelist;
    mapping(address => bool) private _receiverWhitelist;


    constructor(uint256 supply, address liquidityPool, address distributionPool)
                 BEP20("TinFit Token", "TFT", 18) {

        _mint(owner(), supply);

        _initialOwner = owner();
        _liquidityPool = liquidityPool;
        _distributionPool =  distributionPool;

        addToSenderWhitelist(owner());
        addToSenderWhitelist(_liquidityPool);
        addToSenderWhitelist(_distributionPool);
        addToReceiverWhitelist(owner());
        addToReceiverWhitelist(_liquidityPool);
        addToReceiverWhitelist(_distributionPool);

        // 25% of tokens will be locked forever
        _initialOwnerLockedTokenAmount = ((supply * 25) / 100);
    }

    function _transfer(address sender, address recipient, uint256 amount) internal override {

        // 25% of tokens will be locked forever
        if(sender == _initialOwner){
            uint256 balanceAfterTranfer = balanceOf(sender) - amount;
            require(balanceAfterTranfer >= _initialOwnerLockedTokenAmount, 
                        "This transfer passes the treshold of the 25% owner tokens, that are locked forever.");             
        }

        // tax whitelist
        if(isSenderWhitelisted(sender) || isReceiverWhitelisted(recipient)){
            ERC20._transfer(sender, recipient, amount);
        }
        else{
            uint256 tax = calculateTax(amount);
            uint256 splitTax = (tax * 50) / 100 ;
            ERC20._transfer(sender, _liquidityPool, splitTax);
            ERC20._transfer(sender, _distributionPool, splitTax);
            ERC20._transfer(sender, recipient, (amount - tax));
        }  
    }

    function ownerBurn(uint256 amount) public onlyOwner {
        uint256 balanceAfter = balanceOf(_initialOwner) - amount;
            require(balanceAfter >= _initialOwnerLockedTokenAmount, 
                        "This transfer passes the treshold of the 25% owner tokens, that are locked forever.");
        
        ERC20._burn(_initialOwner, amount);
    }

    /*********************************************************************************************
    * WHITELISTING
    **********************************************************************************************/

    function addToSenderWhitelist(address user) public onlyOwner {
        _senderWhitelist[user] = true;
    }

    function removeFromSenderWhitelist(address user) public onlyOwner {
        _senderWhitelist[user] = false;
    }

    function isSenderWhitelisted(address user) public view returns(bool) {
        return _senderWhitelist[user];
    }

    function addToReceiverWhitelist(address user) public onlyOwner {
        _receiverWhitelist[user] = true;
    }

    function removeFromReceiverWhitelist(address user) public onlyOwner {
        _receiverWhitelist[user] = false;
    }

    function isReceiverWhitelisted(address user) public view returns(bool) {
        return _receiverWhitelist[user];
    }


    /*********************************************************************************************
    * TAXING
    **********************************************************************************************/

    function setTaxMultiplicator(uint256 value) public onlyOwner {
        require((value >=0 && value <= 200), "Tax multiplicator must be between 0 and 100");
        _taxMultiplicator = value;
    }

    function calculateTax(uint256 value) private view returns (uint256) {

        uint256 baseTax = calculateBaseTax(value);
        if (baseTax == 0 || _taxMultiplicator == 0){
            return 0;
        }
        else {
            uint256 taxPercentage = (baseTax * _taxMultiplicator) / 100;
            uint256 tax = (value * taxPercentage) / 100;
            return tax;
        }
    }

    function calculateBaseTax(uint256 value) private view returns (uint256) {

        if (value <= 1000 ether){
            return 0;
        }
        if (value > 1000 ether && value <= 10000 ether){
            return 5;
        }
        if (value > 10000 ether && value <= 100000 ether){
            return 10;
        }
        return 15;

    }





}