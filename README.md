[![relayer-contracts](https://github.com/Uxio0/relayer-contracts/actions/workflows/ci.yml/badge.svg)](https://github.com/Uxio0/relayer-contracts/actions/workflows/ci.yml)
# Safe Relayer contract (Hardhat 3 Beta)

Relay Safe transactions using allowances for refunding.

## Deployments

Expected address: `0x8187d0Fb94B91EFD5cC30392bfEf7a63513c5d1F`

- [Sepolia](https://sepolia.etherscan.io/address/0x8187d0Fb94B91EFD5cC30392bfEf7a63513c5d1F)

## Usage

### Running Tests

To run all the tests in the project, execute the following command:

```shell
npx hardhat test
```

You can also selectively run the Solidity or `node:test` tests:

```shell
npx hardhat test solidity
npx hardhat test nodejs
```

### Example deployment to Sepolia

```shell
export SEPOLIA_RPC_URL='https://sepolia.gateway.tenderly.co'
export SEPOLIA_PRIVATE_KEY='0x...'
npx hardhat run scripts/deploy.ts --network sepolia
```
