import type { JobsOptions } from "bullmq";
import {
  getQueues,
  type AuctionCloseJobData,
  type DispatchJobData,
  type NotifyJobData,
  type PspReconcileJobData,
} from "./queues.js";

export async function enqueueDispatch(
  data: DispatchJobData,
  opts?: JobsOptions,
): Promise<string> {
  const job = await getQueues().dispatch.add("dispatch", data, opts);
  return job.id ?? "";
}

export async function enqueueAuctionClose(
  data: AuctionCloseJobData,
  opts?: JobsOptions,
): Promise<string> {
  const job = await getQueues().auctionClose.add("auction-close", data, opts);
  return job.id ?? "";
}

export async function enqueueNotify(
  data: NotifyJobData,
  opts?: JobsOptions,
): Promise<string> {
  const job = await getQueues().notify.add("notify", data, opts);
  return job.id ?? "";
}

export async function enqueuePspReconcile(
  data: PspReconcileJobData,
  opts?: JobsOptions,
): Promise<string> {
  const job = await getQueues().pspReconcile.add("psp-reconcile", data, opts);
  return job.id ?? "";
}
