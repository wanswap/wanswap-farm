const PrivateKeyProvider = require('truffle-privatekey-provider');
module.exports = {
  // Uncommenting the defaults below
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  //
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*"
    },
    coverage: {
      host: '127.0.0.1',
      network_id: '*',
      port: 6545,
    },
    test: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    },
    rinkeby: {
      provider: () => new PrivateKeyProvider('', 'https://rinkeby.infura.io/v3/f977681c79004fad87aa00da8f003597'),
      network_id: 4,
      gasPrice: 10e9,
      gasLimit: 8000000,
      skipDryRun: true
    },
  },
  plugins: [
    "solidity-coverage",
    'truffle-plugin-verify'
  ],
  compilers: {
    solc: {
      version: "0.6.12"
    }
  },
  api_keys: {
    etherscan: ''
  }
};
