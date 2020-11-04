const WanSwapFarm = artifacts.require('WanSwapFarm.sol');
const WaspToken = artifacts.require('WaspToken.sol');

const devaddr = "0x4cf0a877e906dead748a41ae7da8c220e4247d9e";
const waspPerBlock = "11932035127911420000"; //11.932035127911420000 wasp/block
const startBlock = 1000;
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
};
