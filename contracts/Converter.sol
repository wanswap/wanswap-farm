// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Converter is Ownable {
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

    function convert(uint256 _amount) external {
        require(toNewWaspEnabled, "Converter: toNewWasp is disabled");
        IERC20(oldWASP).transferFrom(msg.sender, address(this), _amount);
        IERC20(newWASP).transfer(msg.sender, _amount);
    }

    function convertAll() external {
        require(toNewWaspEnabled, "Converter: toNewWasp is disabled");
        uint256 balance = IERC20(oldWASP).balanceOf(msg.sender);
        IERC20(oldWASP).transferFrom(msg.sender, address(this), balance);
        IERC20(newWASP).transfer(msg.sender, balance);
    }

    function deposit(uint256 _amount) external {
        require(toNewWaspEnabled, "Converter: toNewWasp is disabled");
        IERC20(oldWASP).transferFrom(msg.sender, address(this), _amount);
        IERC20(newWASP).transfer(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external {
        require(toOldWaspEnabled, "Converter: toOldWasp is disabled");
        IERC20(newWASP).transferFrom(msg.sender, address(this), _amount);
        IERC20(oldWASP).transfer(msg.sender, _amount);
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
