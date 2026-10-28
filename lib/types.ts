export type Status = "active" | "expired" | "cancelled";
export type DemoNumber = {
  id: string;
  number: string;
  country: string;
  code: string;
  flag: string;
  price: number;
  enabled: boolean;
  durations: number[];
};
export type Rental = {
  id: string;
  ownerId: string;
  numberId: string;
  start: number;
  expires: number;
  status: Status;
  cost: number;
};
export type Message = {
  id: string;
  rentalId: string;
  ownerId: string;
  sender: string;
  body: string;
  received: number;
  read: boolean;
  kind: "text" | "delivery" | "code";
};
export type Transaction = {
  id: string;
  ownerId: string;
  key: string;
  amount: number;
  type: "credit" | "rental" | "refund";
  description: string;
  at: number;
};
export type State = {
  version: 1;
  numbers: DemoNumber[];
  rentals: Rental[];
  messages: Message[];
  transactions: Transaction[];
  profile: {
    name: string;
    email: string;
    notifications: boolean;
    dark: boolean;
  };
  retentionDays: number;
  audit: { id: string; action: string; at: number }[];
};
export type Actor = { id: string; localAdmin: boolean };
export const customer: Actor = { id: "demo-customer", localAdmin: false };
