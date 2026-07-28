import { ConsoleLogger } from "../common/logger.js";
import { runLamportSimulation } from "./simulation.js";

const verbose = process.argv.includes("--verbose");
await runLamportSimulation({ logger: new ConsoleLogger(true, verbose) });
