import assert from "node:assert/strict";
import { test } from "node:test";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { fillCancellationWorkflow, getOpeningStatus } from "../src/workflows";

test("first acceptance is reserved until staff confirms it in Square", async () => {
  const environment = await TestWorkflowEnvironment.createTimeSkipping();
  try {
    const worker = await Worker.create({
      connection: environment.nativeConnection,
      taskQueue: "starter-test",
      workflowsPath: require.resolve("../src/workflows"),
    });
    await worker.runUntil(async () => {
      const handle = await environment.client.workflow.start(fillCancellationWorkflow, {
        workflowId: "starter-test",
        taskQueue: "starter-test",
        args: ["starter-test"],
      });
      await handle.signal("respondToOffer", { clientId: "maya", response: "accept" });
      const reserved = await handle.query(getOpeningStatus);
      assert.equal(reserved.phase, "awaiting-confirmation");
      assert.equal(reserved.appointment.status, "Reserved pending Square");
      await handle.signal("confirmInSquare");
      const result = await handle.result();
      assert.equal(result.phase, "filled");
      assert.equal(result.clients.find((client) => client.id === "olivia")?.offerStatus, "not-selected");
    });
  } finally {
    await environment.teardown();
  }
});
