import { ConsoleLogger } from "./common/logger.js";
import { runLamportSimulation } from "./parte-a-lamport/simulation.js";
import { runVectorClockSimulation } from "./parte-b-vetorial/scenarios.js";

const logger = new ConsoleLogger();
await runLamportSimulation({ logger });
runVectorClockSimulation(logger);
