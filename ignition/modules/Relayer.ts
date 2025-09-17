import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("RelayerModule", (m) => {
  const token = m.getParameter<string>("token");
  const maxPriorityFee = m.getParameter<bigint>("maxPriorityFee", 1_000_000_000n);
  const relayerFee = m.getParameter<bigint>("relayerFee", 0n);
  const method = m.getParameter<string>("method", "0x00000000");

  const relayer = m.contract("Relayer");

  m.call(relayer, "setup", [token, maxPriorityFee, relayerFee, method]);

  return { relayer };
});
