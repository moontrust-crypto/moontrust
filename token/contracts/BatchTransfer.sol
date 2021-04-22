pragma solidity ^0.8.0;

// SPDX-License-Identifier: No License

import "./IERC20.sol";
import "./SafeERC20.sol";

contract ERC20BatchTransfer {
    using SafeERC20 for IERC20;
    
    address owner;
    address tokenContract;

    event Transfer(address indexed _from, address indexed _to, uint _amount, uint _timestamp);
    event Receive(address indexed _from, address indexed _to, uint _amount, uint _timestamp);
    event Withdraw(address indexed _from, address indexed _to, uint _amount, uint _timestamp);

    constructor (address _tokenContract) {
        owner = msg.sender;
        tokenContract = _tokenContract;
    }

    function batchTransfer(uint _total, address[] calldata _to, uint[] calldata _values) external onlyOwner {
        require(_to.length == _values.length, "_to and _values array length must match.");
        
        IERC20(tokenContract).safeTransferFrom(msg.sender, address(this), _total);
        
        emit Receive(msg.sender, address(this), _total, block.timestamp);

        for (uint256 i = 0; i < _to.length; ++i) {
            address to = _to[i];
            uint value = _values[i];
            IERC20(tokenContract).safeTransfer(to, value);

            emit Transfer(msg.sender, to, value, block.timestamp);
        }
    }

    function withDraw(uint _amount) external onlyOwner {
        require(checkBalance() >= _amount);

        IERC20(tokenContract).safeTransfer(msg.sender, _amount);

        emit Withdraw(address(this), msg.sender, _amount, block.timestamp);
    }

    function checkBalance() public onlyOwner view returns(uint) {
        return IERC20(tokenContract).balanceOf(address(this));
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "caller is not the owner");
        _;
    }
}