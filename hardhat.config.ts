import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";
import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-solhint";

const { PRIVATE_KEY } = process.env;
const KEY =
  PRIVATE_KEY ||
  "0x89ee953f39a41067828eb72edf94ef6d371d5cf89a8ae4ad005bfd4341c07ae8";

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  namedAccounts: {
    deployer: 0,
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    goerli: {
      url: "https://rpc.ankr.com/eth_goerli",
      accounts: [KEY],
    },
    rinkeby: {
      url: "https://rpc.ankr.com/eth_rinkeby",
      accounts: [KEY],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
};

export default config;
