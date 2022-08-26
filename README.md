![CI](https://github.com/Uxio0/relayer-contracts/actions/workflows/ci.yml/badge.svg)

# Safe Relayer contract

Relay Safe transactions using allowances for refunding.

Address `0xCae5e615455196bF3de826FE8f7fBA8efAf19574`. Currently deployed on:

- [Rinkeby](https://rinkeby.etherscan.io/address/0xCae5e615455196bF3de826FE8f7fBA8efAf19574)
- [Goerli](https://goerli.etherscan.io/address/0xCae5e615455196bF3de826FE8f7fBA8efAf19574)

# Set up for development

```shell
yarn
yarn run prepare
```

# Running tests

```shell
REPORT_GAS=true npx hardhat test
```

# Deploying contracts

```shell
export PRIVATE_KEY=''
export ETHERSCAN_API_KEY=''
npx hardhat deploy --network goerli
npx hardhat sourcify
npx hardhat etherscan-verify --api-key $ETHERSCAN_API_KEY
```
