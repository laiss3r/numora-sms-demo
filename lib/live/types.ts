export type Country = {
  code: string;
  name: string;
  types: ("Local" | "Mobile" | "TollFree")[];
};
export type LiveNumber = {
  number: string;
  country: string;
  type: "Local" | "Mobile" | "TollFree";
  monthlyPrice: string;
  currency: string;
  addressRequired: boolean;
};
export type Allocation = {
  id: string;
  number: string;
  started: string;
  status: string;
};
export type IncomingSMS = {
  id: string;
  sender: string;
  body: string;
  received: string;
  number: string;
  source: "twilio" | "textbee";
};
export type LiveStatus = {
  mode: "live";
  authenticated: boolean;
  twilio: boolean;
  textbee: boolean;
  purchaseEnabled: boolean;
  webhooks: boolean;
  issues: string[];
};
export type MessagePage = { messages: IncomingSMS[]; next: string | null };
