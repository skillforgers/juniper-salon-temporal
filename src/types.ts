export type ClientResponse = "accept" | "decline";
export type OfferStatus = "not-contacted" | "waiting" | "declined" | "accepted" | "withdrawn" | "not-selected" | "expired";
export type OpeningPhase = "offering" | "awaiting-confirmation" | "filled" | "unfilled" | "stopped";

export type WaitlistClient = {
  id: string;
  name: string;
  requestedService: string;
  availability: string;
  stylistPreference?: { name: string; required: boolean };
  position: number;
  eligible: boolean;
  ineligibleReason?: string;
  offerStatus: OfferStatus;
};

export type ActivityItem = { id: number; message: string };

export type OpeningStatus = {
  requestId: string;
  appointment: { dateTime: string; service: string; stylist: string; status: "Open" | "Reserved pending Square" | "Filled" | "Stopped" | "Unfilled" };
  phase: OpeningPhase;
  clients: WaitlistClient[];
  selectedClientId?: string;
  offerDeadline?: string;
  activity: ActivityItem[];
};

export type ClientResponseInput = { clientId: string; response: ClientResponse };
