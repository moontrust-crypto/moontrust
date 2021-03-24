pragma solidity 0.8.1;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";


abstract contract BEP20 is ERC20, Ownable {

    uint8 private _decimals;

    constructor(string memory name, string memory symbol, uint8 decimals) 
        ERC20(name, symbol) {
            _decimals = decimals;
        }
    
    function getOwner() public view returns (address){
        return owner();
    }

    function decimals() public view override returns (uint8){
        return _decimals;
    }
}