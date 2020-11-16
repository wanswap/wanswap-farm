const WanSwapFarm = artifacts.require('WanSwapFarm.sol');
const WaspToken = artifacts.require('WaspToken.sol');

const devaddr = "".toLowerCase();
const owner = "".toLowerCase();
const waspPerBlock = "12000000000000000000"; // 12000000000000000000 wasp/block
const startBlock = 10446000;
const testEndBlock = startBlock + 120960; // startBlock + 1.week
const bonusEndBlock = testEndBlock + 1036800; // startBlock + 1.week + 2.month
const allEndBlock = bonusEndBlock + 11456640; // startBlock + 2.year

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(WaspToken);
  console.log('WaspToken.address', WaspToken.address);
  await deployer.deploy(WanSwapFarm,
    WaspToken.address,
    devaddr,
    waspPerBlock,
    startBlock,
    testEndBlock,
    bonusEndBlock,
    allEndBlock
  );
  console.log('WanSwapFarm.address', WanSwapFarm.address);

  let wasp = await WaspToken.deployed();
  let farm = await WanSwapFarm.deployed();
  let receipt = await wasp.transferOwnership(farm.address);
  console.log("wasp owner", (await wasp.owner()))

  if (owner !== accounts[0].toLowerCase()) {
    receipt = await farm.transferOwnership(owner);
  }
  console.log("farm owner", (await farm.owner()))
};
