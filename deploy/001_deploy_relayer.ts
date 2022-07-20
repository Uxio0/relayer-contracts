import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const chainConfigurations: { [index: string]: any } = {
    "5": {
      tokenAddresss: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
      maxPriorityFee: ethers.utils.parseUnits("2", "gwei"),
      relayerFee: ethers.BigNumber.from("0"),
    },
    "100": {
      tokenAddresss: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d",
      maxPriorityFee: ethers.utils.parseUnits("2", "gwei"),
      relayerFee: ethers.BigNumber.from("0"),
    },
  };

  const chainId = await getChainId();
  const chainConfiguration = chainConfigurations[chainId];

  if (chainConfiguration) {
    console.log("Deploying on", chainId);

    await deploy("Relayer", {
      from: deployer,
      args: [
        chainConfiguration.tokenAddresss,
        chainConfiguration.maxPriorityFee,
        chainConfiguration.relayerFee,
        "0x6a761202",
      ],
      log: true,
      autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
      deterministicDeployment: true,
    });
  } else {
    console.log("Cannot find chainConfiguration for deploying on", chainId);
  }
};
export default func;
func.tags = ["Relayer"];
