// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Converter is Ownable {
    using SafeERC20 for IERC20;
    address public oldWASP;
    address public newWASP;

    bool public toOldWaspEnabled;

    constructor(address _oldWASP, address _newWASP) public {
        oldWASP = _oldWASP;
        newWASP = _newWASP;
        toOldWaspEnabled = true;
    }

    function convertAll() external {
        uint256 balance = IERC20(oldWASP).balanceOf(msg.sender);
        deposit(balance);
    }

    function deposit(uint256 _amount) public {
        IERC20(oldWASP).safeTransferFrom(msg.sender, address(this), _amount);
        IERC20(newWASP).safeTransfer(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external {
        require(toOldWaspEnabled, "Converter: Not allowed to convert to old WASP");
        IERC20(newWASP).safeTransferFrom(msg.sender, address(this), _amount);
        IERC20(oldWASP).safeTransfer(msg.sender, _amount);
    }

    function enableToOldWasp() external onlyOwner {
        toOldWaspEnabled = true;
    }

    function disableToOldWasp() external onlyOwner {
        toOldWaspEnabled = false;
    }
}
