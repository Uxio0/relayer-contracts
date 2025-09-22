import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("RelayerModule", (m) => {
  const token = m.getParameter<string>("tokenAddress");
  const maxPriorityFee = m.getParameter<bigint>("maxPriorityFee");
  const relayerFee = m.getParameter<bigint>("relayerFee");
  const method = m.getParameter<string>("method", "0x6a761202");

  const relayer = m.contract("Relayer");

  m.call(relayer, "setup", [token, maxPriorityFee, relayerFee, method]);

  return { relayer };
});
