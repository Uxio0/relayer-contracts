import hre from "hardhat";
import RelayerModule from "../ignition/modules/Relayer.js";
import { parseGwei } from "viem";

interface ChainConfiguration {
  tokenAddress: string;
  maxPriorityFee: bigint;
  relayerFee: bigint;
}

const chainConfigurations: { [index: number]: ChainConfiguration } = {
  4: {
    tokenAddress: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
    maxPriorityFee: parseGwei("2"),
    relayerFee: parseGwei("0"),
  },
  5: {
    tokenAddress: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
    maxPriorityFee: parseGwei("2"),
    relayerFee: parseGwei("0"),
  },
  100: {
    tokenAddress: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d",
    maxPriorityFee: parseGwei("2"),
    relayerFee: parseGwei("0"),
  },
  31337: {
    tokenAddress: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d",
    maxPriorityFee: parseGwei("2"),
    relayerFee: parseGwei("0"),
  },
  11155111: {
    tokenAddress: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
    maxPriorityFee: parseGwei("2"),
    relayerFee: parseGwei("0"),
  },
};

async function main() {
  const connection = await hre.network.connect();
  const viemClient = await connection.viem.getPublicClient();
  const chainId = await viemClient.getChainId();
  const chainConfiguration: any = chainConfigurations[chainId];
  if (chainConfiguration === undefined) {
    console.log(`chainId ${chainId} configuration not defined`);
  } else {
    console.log(chainConfiguration);
    const code = await viemClient.getCode({
      address: chainConfiguration.tokenAddress,
    });
    if (code === undefined) {
      console.log(
        `WETH contract ${chainConfiguration.tokenAddress} is not deployed`,
      );
    } else {
      const { relayer } = await connection.ignition.deploy(RelayerModule, {
        parameters: { RelayerModule: chainConfiguration },
      });
      console.log(
        `Relayer deployed to ${relayer.address} in chainId ${chainId}`,
      );
    }
  }
}

main().catch(console.error);
