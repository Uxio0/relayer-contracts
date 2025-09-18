import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  parseGwei,
} from "viem";

export default buildModule("RelayerModule", (m) => {
  const token = m.getParameter<string>("tokenAddress");
  const maxPriorityFee = m.getParameter<string>("maxPriorityFee");
  const relayerFee = m.getParameter<string>("relayerFee");
  const method = m.getParameter<string>("method", "0x6a761202");

  const relayer = m.contract("Relayer");

  m.call(relayer, "setup", [token, maxPriorityFee, relayerFee, method]);

  return { relayer };
});
