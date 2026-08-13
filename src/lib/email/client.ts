import "server-only";

import { z } from "zod";
import { serverEnv } from "@/lib/env";

const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailSendResult = { messageId: string };

export interface EmailClient {
  send(message: EmailMessage): Promise<EmailSendResult>;
}

type Fetch = typeof fetch;
type Logger = Pick<Console, "info">;

const resendResponseSchema = z.object({ id: z.string().min(1) });

export type CreateEmailClientOptions = {
  fetchImpl?: Fetch;
  logger?: Logger;
  createId?: () => string;
};

/** Uses Resend when configured and a network-free logger in local development. */
export function createEmailClient(options: CreateEmailClientOptions = {}): EmailClient {
  const apiKey = serverEnv.resendApiKey;
  if (!apiKey) {
    const logger = options.logger ?? console;
    const createId = options.createId ?? (() => crypto.randomUUID());
    return {
      async send(message) {
        const messageId = `dev-${createId()}`;
        logger.info("Email recorded by the development logger.", {
          messageId,
          to: message.to,
          subject: message.subject,
        });
        return { messageId };
      },
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const from = serverEnv.emailFrom;
  return {
    async send(message) {
      const response = await fetchImpl(RESEND_EMAILS_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, ...message }),
      });
      if (!response.ok) {
        throw new Error(`Resend request failed with status ${response.status}.`);
      }
      const result = resendResponseSchema.parse(await response.json());
      return { messageId: result.id };
    },
  };
}

type MaybePromise<T> = T | Promise<T>;

export type FakeEmailHandler = (message: EmailMessage) => MaybePromise<EmailSendResult>;

export class FakeEmailClient implements EmailClient {
  readonly calls: EmailMessage[] = [];

  constructor(private readonly handler?: FakeEmailHandler) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    this.calls.push(message);
    return this.handler ? this.handler(message) : { messageId: `fake-email-${this.calls.length}` };
  }
}
