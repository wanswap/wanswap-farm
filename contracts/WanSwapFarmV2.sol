// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;


import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./WaspTokenV2.sol";



// WanSwapFarm is the master of WASP. He can make WASP and he is a fair guy.
//
// Note that it's ownable and the owner wields tremendous power. The ownership
// will be transferred to a governance smart contract once WASP is sufficiently
// distributed and the community can show to govern itself.
//
// Have fun reading it. Hopefully it's bug-free. God bless.
contract WanSwapFarm is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Info of each user.
    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        //
        // We do some fancy math here. Basically, any point in time, the amount of WASPs
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * pool.accWaspPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
        //   1. The pool's `accWaspPerShare` (and `lastRewardTimestamp`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    // Info of each pool.
    struct PoolInfo {
        IERC20 lpToken;           // Address of LP token contract.
        uint256 allocPoint;       // How many allocation points assigned to this pool. WASPs to distribute per block.
        uint256 lastRewardTimestamp;  // Last block number that WASPs distribution occurs.
        uint256 accWaspPerShare;  // Accumulated WASPs per share, times 1e12. See below.
    }

    // The WASP TOKEN!
    WaspTokenV2 public wasp;
    // Dev address.
    address public devaddr;
    // Timestamp when all reward ends.
    uint256 public allEndTime;
    // WASP tokens created per block.
    uint256 public waspPerSecond;

    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping (uint256 => mapping (address => UserInfo)) public userInfo;
    // Total allocation poitns. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;
    // The timestamp when WASP mining starts.
    uint256 public startTime;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);

    constructor(
        WaspTokenV2 _wasp,
        address _devaddr,
        uint256 _waspPerSecond,
        uint256 _startTime,
        uint256 _allEndTime
    ) public {
        wasp = _wasp;
        devaddr = _devaddr;
        waspPerSecond = _waspPerSecond;
        startTime = _startTime;
        allEndTime = _allEndTime;
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    // Add a new lp to the pool. Can only be called by the owner.
    // XXX DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    function add(uint256 _allocPoint, IERC20 _lpToken, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 lastRewardTimestamp = block.timestamp > startTime ? block.timestamp : startTime;
        totalAllocPoint = totalAllocPoint.add(_allocPoint);
        poolInfo.push(PoolInfo({
            lpToken: _lpToken,
            allocPoint: _allocPoint,
            lastRewardTimestamp: lastRewardTimestamp,
            accWaspPerShare: 0
        }));
    }

    // Update the given pool's WASP allocation point. Can only be called by the owner.
    function set(uint256 _pid, uint256 _allocPoint, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
        poolInfo[_pid].allocPoint = _allocPoint;
    }

    // Return reward multiplier over the given _from to _to timestamp.
    function getMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
        if (_from >= allEndTime) {
            return 0;
        }

        uint256 noRewardCount = 0;
        if (_to >= allEndTime) {
            noRewardCount = _to.sub(allEndTime);
        }

        if (_from < startTime) {
            if (_to < startTime) {
                return 0;
            } else {
                return _to.sub(startTime).sub(noRewardCount);
            }
        } else {
            return _to.sub(_from).sub(noRewardCount);
        }
    }

    // View function to see pending WASPs on frontend.
    function pendingWasp(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accWaspPerShare = pool.accWaspPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (block.timestamp > pool.lastRewardTimestamp && lpSupply != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardTimestamp, block.timestamp);
            uint256 waspReward = multiplier.mul(waspPerSecond).mul(pool.allocPoint).div(totalAllocPoint);
            accWaspPerShare = accWaspPerShare.add(waspReward.mul(1e12).div(lpSupply));
        }
        return user.amount.mul(accWaspPerShare).div(1e12).sub(user.rewardDebt);
    }

    // Update reward vairables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.timestamp <= pool.lastRewardTimestamp) {
            return;
        }
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (lpSupply == 0) {
            pool.lastRewardTimestamp = block.timestamp;
            return;
        }
        uint256 multiplier = getMultiplier(pool.lastRewardTimestamp, block.timestamp);
        uint256 waspReward = multiplier.mul(waspPerSecond).mul(pool.allocPoint).div(totalAllocPoint);
        wasp.mint(devaddr, waspReward.div(20));
        wasp.mint(address(this), waspReward);
        pool.accWaspPerShare = pool.accWaspPerShare.add(waspReward.mul(1e12).div(lpSupply));
        pool.lastRewardTimestamp = block.timestamp;
    }

    // Deposit LP tokens to WanSwapFarm for WASP allocation.
    function deposit(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accWaspPerShare).div(1e12).sub(user.rewardDebt);
            safeWaspTransfer(msg.sender, pending);
        }
        if(_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            user.amount = user.amount.add(_amount);
        }
        user.rewardDebt = user.amount.mul(pool.accWaspPerShare).div(1e12);
        emit Deposit(msg.sender, _pid, _amount);
    }

    // Withdraw LP tokens from WanSwapFarm.
    function withdraw(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);
        uint256 pending = user.amount.mul(pool.accWaspPerShare).div(1e12).sub(user.rewardDebt);
        user.amount = user.amount.sub(_amount);
        user.rewardDebt = user.amount.mul(pool.accWaspPerShare).div(1e12);
        safeWaspTransfer(msg.sender, pending);
        pool.lpToken.safeTransfer(address(msg.sender), _amount);
        emit Withdraw(msg.sender, _pid, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        pool.lpToken.safeTransfer(address(msg.sender), amount);
        emit EmergencyWithdraw(msg.sender, _pid, amount);
    }

    // Safe wasp transfer function, just in case if rounding error causes pool to not have enough WASPs.
    function safeWaspTransfer(address _to, uint256 _amount) internal {
        uint256 waspBal = wasp.balanceOf(address(this));
        if (_amount > waspBal) {
            wasp.transfer(_to, waspBal);
        } else {
            wasp.transfer(_to, _amount);
        }
    }

    // Update dev address by the previous dev.
    function dev(address _devaddr) public {
        require(msg.sender == devaddr, "Should be dev address");
        devaddr = _devaddr;
    }
}
