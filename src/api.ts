import { randomUUID } from "node:crypto";
import path from "node:path";
import { Client, Connection } from "@temporalio/client";
import express, { type NextFunction, type Request, type Response } from "express";
import type { ClientResponseInput, OpeningStatus } from "./types";
import {
  acceptedClientBackedOut,
  confirmInSquare,
  fillCancellationWorkflow,
  getOpeningStatus,
  respondToOffer,
  stopFilling,
} from "./workflows";

const app = express();
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

let clientPromise: Promise<Client> | undefined;
function getClient(): Promise<Client> {
  clientPromise ??= Connection.connect({
    address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
  }).then((connection) => new Client({ connection, namespace: "default" }));
  return clientPromise;
}

app.post("/api/openings", async (_request, response) => {
  const requestId = `juniper-${randomUUID()}`;
  const client = await getClient();
  await client.workflow.start(fillCancellationWorkflow, {
    workflowId: requestId,
    taskQueue: "assessment-starter",
    args: [requestId],
  });
  response.status(201).json({ requestId });
});

app.get("/api/openings/:requestId", async (request, response) => {
  const client = await getClient();
  const status = await client.workflow
    .getHandle(request.params.requestId)
    .query<OpeningStatus>(getOpeningStatus);
  response.json(status);
});

app.post("/api/openings/:requestId/respond", async (request, response) => {
  const input = request.body as ClientResponseInput;
  if (!input?.clientId || !["accept", "decline"].includes(input.response)) {
    response.status(400).json({ error: "Provide a clientId and an accept or decline response." });
    return;
  }
  const client = await getClient();
  await client.workflow.getHandle(request.params.requestId).signal(respondToOffer, input);
  response.status(202).json({ accepted: true });
});

app.post("/api/openings/:requestId/confirm", async (request, response) => {
  const client = await getClient();
  await client.workflow.getHandle(request.params.requestId).signal(confirmInSquare);
  response.status(202).json({ accepted: true });
});

app.post("/api/openings/:requestId/back-out", async (request, response) => {
  const client = await getClient();
  await client.workflow.getHandle(request.params.requestId).signal(acceptedClientBackedOut);
  response.status(202).json({ accepted: true });
});

app.post("/api/openings/:requestId/stop", async (request, response) => {
  const client = await getClient();
  await client.workflow.getHandle(request.params.requestId).signal(stopFilling);
  response.status(202).json({ accepted: true });
});

app.use(
  (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    console.error(error);
    response.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected error",
    });
  },
);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Juniper Salon prototype is available at http://localhost:${port}`));
