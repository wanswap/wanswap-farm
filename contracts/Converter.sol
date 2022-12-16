// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Converter is Ownable {
    using SafeERC20 for IERC20;
    address public oldWASP;
    address public newWASP;

    bool public toNewWaspEnabled;
    bool public toOldWaspEnabled;

    constructor(address _oldWASP, address _newWASP) public {
        oldWASP = _oldWASP;
        newWASP = _newWASP;
        toNewWaspEnabled = true;
        toOldWaspEnabled = true;
    }

    function convertAll() external {
        require(toNewWaspEnabled, "Converter: Not allowed to convert to new WASP");
        uint256 balance = IERC20(oldWASP).balanceOf(msg.sender);
        deposit(balance);
    }

    function deposit(uint256 _amount) public {
        require(toNewWaspEnabled, "Converter: Not allowed to convert to new WASP");
        IERC20(oldWASP).safeTransferFrom(msg.sender, address(this), _amount);
        IERC20(newWASP).safeTransfer(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external {
        require(toOldWaspEnabled, "Converter: Not allowed to convert to old WASP");
        IERC20(newWASP).safeTransferFrom(msg.sender, address(this), _amount);
        IERC20(oldWASP).safeTransfer(msg.sender, _amount);
    }

    function enableToNewWasp() external onlyOwner {
        toNewWaspEnabled = true;
    }

    function disableToNewWasp() external onlyOwner {
        toNewWaspEnabled = false;
    }

    function enableToOldWasp() external onlyOwner {
        toOldWaspEnabled = true;
    }

    function disableToOldWasp() external onlyOwner {
        toOldWaspEnabled = false;
    }
}
