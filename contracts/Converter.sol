// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Converter {
    address public oldWASP;
    address public newWASP;

    constructor(address _oldWASP, address _newWASP) public {
        oldWASP = _oldWASP;
        newWASP = _newWASP;
    }

    function convert(uint256 _amount) public {
        IERC20(oldWASP).transferFrom(msg.sender, address(this), _amount);
        IERC20(newWASP).transfer(msg.sender, _amount);
    }

    function convertAll() public {
        uint256 balance = IERC20(oldWASP).balanceOf(msg.sender);
        IERC20(oldWASP).transferFrom(msg.sender, address(this), balance);
        IERC20(newWASP).transfer(msg.sender, balance);
    }

    function deposit(uint256 _amount) public {
        IERC20(oldWASP).transferFrom(msg.sender, address(this), _amount);
        IERC20(newWASP).transfer(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) public {
        IERC20(newWASP).transferFrom(msg.sender, address(this), _amount);
        IERC20(oldWASP).transfer(msg.sender, _amount);
    }
}
