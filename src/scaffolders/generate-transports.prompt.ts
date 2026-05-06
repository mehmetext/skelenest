import { cancel, isCancel, multiselect } from "@clack/prompts";
import chalk from "chalk";
import { ApiTransport } from "../generate/types";

function formatTransportLabel(transport: ApiTransport): string {
  return transport === "rest" ? "REST" : "GraphQL";
}

export async function resolveGenerateTransports(input: {
  availableTransports: ApiTransport[];
  message: string;
}): Promise<ApiTransport[]> {
  const { availableTransports, message } = input;

  if (availableTransports.length === 1) {
    return [...availableTransports];
  }

  const transports = (await multiselect({
    message,
    required: true,
    initialValues: [...availableTransports],
    options: availableTransports.map((transport) => ({
      value: transport,
      label: formatTransportLabel(transport),
      hint:
        transport === "rest"
          ? "Generate controllers and HTTP routes"
          : "Generate resolvers and GraphQL types",
    })),
  })) as ApiTransport[];

  if (isCancel(transports) || transports.length === 0) {
    cancel(chalk.red("Generation cancelled."));
    return [];
  }

  return transports;
}
