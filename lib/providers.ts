import { DemoNumber, Message, State, Actor } from "./types";
import { filterNumbers, rent, cancel } from "./demo";
export interface NumberProvider {
  listAvailableNumbers(): Promise<DemoNumber[]>;
  getNumberDetails(id: string): Promise<DemoNumber | undefined>;
  reserveNumber(id: string, days: number): Promise<void>;
  releaseNumber(rentalId: string): Promise<void>;
}
export interface MessagingProvider {
  getMessages(rentalId: string): Promise<Message[]>;
  validateWebhook(raw: string, signature: string): Promise<boolean>;
  processIncomingMessage(raw: string): Promise<never>;
}
export interface PaymentProvider {
  createCheckoutSession(): Promise<never>;
  processVerifiedPaymentWebhook(): Promise<never>;
  issueRefund(): Promise<never>;
}
export interface AuthenticationAdapter {
  getSession(): Promise<{ id: string; isDemo: true }>;
  requireProductionRole(role: string): Promise<never>;
}
export class NotConfiguredError extends Error {
  constructor() {
    super(
      "Live integration is not configured. No real-world operation was performed.",
    );
  }
}
export class DemoNumberProvider implements NumberProvider {
  constructor(
    private get: () => State,
    private set: (s: State) => void,
    private actor: Actor,
  ) {}
  async listAvailableNumbers() {
    return filterNumbers(this.get(), "", "", 100000, 1, true);
  }
  async getNumberDetails(id: string) {
    return this.get().numbers.find((n) => n.id === id);
  }
  async reserveNumber(id: string, days: number) {
    this.set(rent(this.get(), this.actor, id, days));
  }
  async releaseNumber(id: string) {
    this.set(cancel(this.get(), this.actor, id));
  }
}
export class DemoMessagingProvider implements MessagingProvider {
  constructor(
    private get: () => State,
    private actor: Actor,
  ) {}
  async getMessages(id: string) {
    return this.get().messages.filter(
      (m) => m.ownerId === this.actor.id && m.rentalId === id,
    );
  }
  async validateWebhook(raw: string, signature: string) {
    void raw;
    void signature;
    return false;
  }
  async processIncomingMessage(raw: string): Promise<never> {
    void raw;
    throw new NotConfiguredError();
  }
}
export class UnconfiguredPaymentProvider implements PaymentProvider {
  async createCheckoutSession(): Promise<never> {
    throw new NotConfiguredError();
  }
  async processVerifiedPaymentWebhook(): Promise<never> {
    throw new NotConfiguredError();
  }
  async issueRefund(): Promise<never> {
    throw new NotConfiguredError();
  }
}
export const demoAuth: AuthenticationAdapter = {
  async getSession() {
    return { id: "demo-customer", isDemo: true };
  },
  async requireProductionRole() {
    throw new NotConfiguredError();
  },
};
