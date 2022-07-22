import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";

interface ChainConfiguration {
  tokenAddress: string;
  maxPriorityFee: BigNumberish;
  relayerFee: BigNumberish;
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const chainConfigurations: { [index: string]: ChainConfiguration } = {
    "4": {
      tokenAddress: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
      maxPriorityFee: ethers.utils.parseUnits("2", "gwei"),
      relayerFee: ethers.BigNumber.from("0"),
    },
    "5": {
      tokenAddress: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
      maxPriorityFee: ethers.utils.parseUnits("2", "gwei"),
      relayerFee: ethers.BigNumber.from("0"),
    },
    "100": {
      tokenAddress: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d",
      maxPriorityFee: ethers.utils.parseUnits("2", "gwei"),
      relayerFee: ethers.BigNumber.from("0"),
    },
    "31337": {
      tokenAddress: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d",
      maxPriorityFee: ethers.utils.parseUnits("2", "gwei"),
      relayerFee: ethers.BigNumber.from("0"),
    },
  };

  const chainId = await getChainId();
  const chainConfiguration = chainConfigurations[chainId];

  if (chainConfiguration) {
    console.log("Deploying on", chainId);

    const deployResult = await deploy("Relayer", {
      from: deployer,
      args: [],
      log: true,
      autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
      deterministicDeployment: true,
    });

    if (deployResult.newlyDeployed) {
      console.log("Setting up contract");
      const relayer = await hre.ethers.getContractAt(
        "Relayer",
        deployResult.address
      );
      await relayer.setup(
        chainConfiguration.tokenAddress,
        chainConfiguration.maxPriorityFee,
        chainConfiguration.relayerFee,
        "0x6a761202"
      );
      console.log("Contract set up");
    }
  } else {
    console.log("Cannot find chainConfiguration for deploying on", chainId);
  }
};
export default func;
func.tags = ["Relayer"];
