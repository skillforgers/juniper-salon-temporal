import {
  condition,
  defineQuery,
  defineSignal,
  setHandler,
  workflowInfo,
} from "@temporalio/workflow";
import type { ClientResponseInput, OpeningStatus, WaitlistClient } from "./types";

export const respondToOffer = defineSignal<[ClientResponseInput]>("respondToOffer");
export const confirmInSquare = defineSignal("confirmInSquare");
export const acceptedClientBackedOut = defineSignal("acceptedClientBackedOut");
export const stopFilling = defineSignal("stopFilling");
export const getOpeningStatus = defineQuery<OpeningStatus>("getOpeningStatus");

const OFFER_TIMEOUT_MS = 10 * 60 * 1000;
const OFFER_BATCH_SIZE = 2;

function demoWaitlist(): WaitlistClient[] {
  return [
    { id: "maya", name: "Maya Chen", requestedService: "Haircut", availability: "Thu afternoons", position: 1, eligible: true, offerStatus: "not-contacted" },
    { id: "olivia", name: "Olivia Lee", requestedService: "Haircut", availability: "Thu 1–4 PM", stylistPreference: { name: "Carla", required: true }, position: 2, eligible: true, offerStatus: "not-contacted" },
    { id: "priya", name: "Priya Shah", requestedService: "Haircut", availability: "Thu afternoons", position: 3, eligible: true, offerStatus: "not-contacted" },
    { id: "ava", name: "Ava Brooks", requestedService: "Color", availability: "Thu afternoons", position: 4, eligible: false, ineligibleReason: "Requested service is Color", offerStatus: "not-contacted" },
    { id: "nora", name: "Nora Kim", requestedService: "Haircut", availability: "Thu afternoons", stylistPreference: { name: "Lena", required: true }, position: 5, eligible: false, ineligibleReason: "Requires stylist Lena", offerStatus: "not-contacted" },
    { id: "ella", name: "Ella Park", requestedService: "Haircut", availability: "Weekends only", position: 6, eligible: false, ineligibleReason: "Not available Thursday afternoon", offerStatus: "not-contacted" },
  ];
}

// One Workflow represents the durable effort to fill one cancelled appointment.
export async function fillCancellationWorkflow(requestId: string): Promise<OpeningStatus> {
  const clients = demoWaitlist();
  let phase: OpeningStatus["phase"] = "offering";
  let selectedClientId: string | undefined;
  let offerDeadline: string | undefined;
  let activityNumber = 0;
  const activity: OpeningStatus["activity"] = [];
  const addActivity = (message: string) => activity.unshift({ id: ++activityNumber, message });
  const currentPhase = (): OpeningStatus["phase"] => phase;
  const currentStatus = (): OpeningStatus => ({
    requestId,
    appointment: { dateTime: "Thursday, October 8 · 2:00 PM", service: "Haircut · 60 min", stylist: "Carla", status: phase === "filled" ? "Filled" : phase === "stopped" ? "Stopped" : phase === "unfilled" ? "Unfilled" : phase === "awaiting-confirmation" ? "Reserved pending Square" : "Open" },
    phase, clients, selectedClientId, offerDeadline, activity,
  });
  const offerNextBatch = () => {
    const next = clients.filter((client) => client.eligible && client.offerStatus === "not-contacted").slice(0, OFFER_BATCH_SIZE);
    if (!next.length) { phase = "unfilled"; offerDeadline = undefined; addActivity("No eligible clients remain. This opening was left unfilled."); return; }
    for (const client of next) client.offerStatus = "waiting";
    offerDeadline = new Date(Date.now() + OFFER_TIMEOUT_MS).toISOString();
    addActivity(`Simulated offers sent to ${next.map((client) => client.name).join(" and ")}.`);
  };

  setHandler(getOpeningStatus, currentStatus);
  setHandler(respondToOffer, ({ clientId, response }) => {
    const client = clients.find((candidate) => candidate.id === clientId);
    if (!client || client.offerStatus !== "waiting") return;
    if (phase !== "offering") { addActivity(`${client.name}'s simulated response arrived after another client was reserved.`); return; }
    if (response === "decline") { client.offerStatus = "declined"; addActivity(`${client.name} declined the opening.`); return; }
    client.offerStatus = "accepted";
    selectedClientId = client.id;
    phase = "awaiting-confirmation";
    offerDeadline = undefined;
    addActivity(`${client.name} accepted first. The opening is reserved pending staff confirmation in Square.`);
  });
  setHandler(confirmInSquare, () => {
    if (phase !== "awaiting-confirmation" || !selectedClientId) return;
    const selected = clients.find((client) => client.id === selectedClientId);
    for (const client of clients) if (client.offerStatus === "waiting") client.offerStatus = "not-selected";
    phase = "filled";
    addActivity(`${selected?.name ?? "Client"} was confirmed in Square (simulated). Other offered clients were notified.`);
  });
  setHandler(acceptedClientBackedOut, () => {
    if (phase !== "awaiting-confirmation" || !selectedClientId) return;
    const selected = clients.find((client) => client.id === selectedClientId);
    if (selected) selected.offerStatus = "withdrawn";
    selectedClientId = undefined;
    phase = "offering";
    addActivity(`${selected?.name ?? "Client"} backed out. Continuing with the remaining waitlist.`);
  });
  setHandler(stopFilling, () => {
    if (phase === "filled" || phase === "unfilled") return;
    for (const client of clients) if (client.offerStatus === "waiting") client.offerStatus = "not-selected";
    phase = "stopped";
    offerDeadline = undefined;
    addActivity("Staff stopped this process because the appointment was filled another way.");
  });

  addActivity(`Cancellation opening created in Temporal workflow ${workflowInfo().workflowId}. Eligible clients are ordered by waitlist position.`);
  offerNextBatch();
  while (currentPhase() === "offering" || currentPhase() === "awaiting-confirmation") {
    if (currentPhase() === "awaiting-confirmation") {
      await condition(() => phase !== "awaiting-confirmation");
      if (currentPhase() === "offering" && !clients.some((client) => client.offerStatus === "waiting")) offerNextBatch();
      continue;
    }
    const changedBeforeTimeout = await condition(() => phase !== "offering" || !clients.some((client) => client.offerStatus === "waiting"), OFFER_TIMEOUT_MS);
    if (currentPhase() !== "offering") continue;
    if (!changedBeforeTimeout) {
      for (const client of clients) if (client.offerStatus === "waiting") client.offerStatus = "expired";
      addActivity("The 10-minute Temporal response timer expired for the current offers.");
    }
    if (!clients.some((client) => client.offerStatus === "waiting")) offerNextBatch();
  }
  return currentStatus();
}
