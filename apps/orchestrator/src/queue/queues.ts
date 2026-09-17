import { Queue } from "bullmq";
import { queueConnection } from "./connection.js";

export const QUEUE_NAMES = {
  dispatch: "dispatch",
  auctionClose: "auction-close",
  notify: "notify",
  pspReconcile: "psp-reconcile",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export type DispatchJobData = {
  rideId: string;
  pickupLat: number;
  pickupLng: number;
  radiusM?: number;
};

export type AuctionCloseJobData = {
  auctionId: string;
  rideId?: string;
};

export type NotifyJobData = {
  userId?: string;
  deviceToken?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type PspReconcileJobData = {
  paymentId?: string;
  since?: string;
  /** From POST /webhooks/psp */
  event?: string;
  userId?: string;
  amountIqd?: number;
  status?: string;
  payload?: Record<string, unknown>;
};

export type JobDataMap = {
  dispatch: DispatchJobData;
  "auction-close": AuctionCloseJobData;
  notify: NotifyJobData;
  "psp-reconcile": PspReconcileJobData;
};

type QueueMap = {
  dispatch: Queue<DispatchJobData, void, string>;
  auctionClose: Queue<AuctionCloseJobData, void, string>;
  notify: Queue<NotifyJobData, void, string>;
  pspReconcile: Queue<PspReconcileJobData, void, string>;
};

let queues: QueueMap | null = null;

export function getQueues(): QueueMap {
  if (!queues) {
    queues = {
      dispatch: new Queue<DispatchJobData>(QUEUE_NAMES.dispatch, {
        connection: queueConnection,
        defaultJobOptions: {
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
        },
      }),
      auctionClose: new Queue<AuctionCloseJobData>(QUEUE_NAMES.auctionClose, {
        connection: queueConnection,
        defaultJobOptions: {
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
        },
      }),
      notify: new Queue<NotifyJobData>(QUEUE_NAMES.notify, {
        connection: queueConnection,
        defaultJobOptions: {
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 5,
          backoff: { type: "exponential", delay: 1000 },
        },
      }),
      pspReconcile: new Queue<PspReconcileJobData>(QUEUE_NAMES.pspReconcile, {
        connection: queueConnection,
        defaultJobOptions: {
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
        },
      }),
    };
  }
  return queues;
}

export async function closeQueues(): Promise<void> {
  if (!queues) return;
  await Promise.all([
    queues.dispatch.close(),
    queues.auctionClose.close(),
    queues.notify.close(),
    queues.pspReconcile.close(),
  ]);
  queues = null;
}
