![CI](https://github.com/Uxio0/relayer-contracts/actions/workflows/ci.yml/badge.svg)

# Safe Relayer contract

Relay Safe transactions using allowances for refunding.

Address `0x569212Bc7D93F6B64aE922101BaE91d526A2913b`. Currently deployed on:

- [Goerli](https://goerli.etherscan.io/address/0x569212Bc7D93F6B64aE922101BaE91d526A2913b)

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
