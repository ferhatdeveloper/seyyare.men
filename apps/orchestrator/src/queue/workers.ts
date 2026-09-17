import { Worker, type Job } from "bullmq";
import { db } from "../lib/db.js";
import { queueConnection } from "./connection.js";
import {
  QUEUE_NAMES,
  type AuctionCloseJobData,
  type DispatchJobData,
  type NotifyJobData,
  type PspReconcileJobData,
} from "./queues.js";

let workers: Worker[] = [];
let started = false;

type MatchedRideRow = {
  id: string;
  rider_id: string;
  driver_id: string | null;
  status: string;
  gender_pref: string | null;
};

/**
 * Dispatch scaffold: call match_ride RPC (nearest online driver via nearby_drivers).
 * Falls back to structured log if RPC missing / no driver / DB error.
 */
async function processDispatch(job: Job<DispatchJobData>): Promise<void> {
  const { rideId, pickupLat, pickupLng, radiusM } = job.data;
  const startedAt = Date.now();

  try {
    const res = await db.query<MatchedRideRow>(
      `SELECT id, rider_id, driver_id, status, gender_pref
       FROM public.match_ride($1::uuid)`,
      [rideId],
    );
    const ride = res.rows[0];

    if (!ride) {
      console.log(
        JSON.stringify({
          event: "dispatch.match",
          jobId: job.id,
          rideId,
          pickupLat,
          pickupLng,
          radiusM: radiusM ?? 5000,
          result: "empty",
          ms: Date.now() - startedAt,
        }),
      );
      return;
    }

    const matched = ride.status === "matched" && !!ride.driver_id;
    console.log(
      JSON.stringify({
        event: "dispatch.match",
        jobId: job.id,
        rideId: ride.id,
        riderId: ride.rider_id,
        driverId: ride.driver_id,
        status: ride.status,
        genderPref: ride.gender_pref,
        pickupLat,
        pickupLng,
        radiusM: radiusM ?? 5000,
        result: matched ? "matched" : "no_driver",
        ms: Date.now() - startedAt,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Structured fallback so ops can see match attempts even when RPC/DB is down
    console.log(
      JSON.stringify({
        event: "dispatch.match",
        jobId: job.id,
        rideId,
        pickupLat,
        pickupLng,
        radiusM: radiusM ?? 5000,
        result: "error",
        error: message,
        ms: Date.now() - startedAt,
      }),
    );
    throw err;
  }
}

async function processAuctionClose(job: Job<AuctionCloseJobData>): Promise<void> {
  console.log(`[queue:auction-close] job=${job.id}`, job.data);
}

async function processNotify(job: Job<NotifyJobData>): Promise<void> {
  // Push stub — wire FCM/APNs later
  console.log(`[queue:notify] job=${job.id}`, job.data);
}

async function processPspReconcile(job: Job<PspReconcileJobData>): Promise<void> {
  console.log(`[queue:psp-reconcile] job=${job.id}`, job.data);
}

/**
 * Start BullMQ workers in-process.
 * Default ON when NODE_ENV !== "test". Set QUEUE_WORKERS=0 to disable,
 * or QUEUE_WORKERS=1 for explicit enable (e.g. docker).
 */
export function shouldStartWorkers(): boolean {
  if (process.env.NODE_ENV === "test") return false;
  if (process.env.QUEUE_WORKERS === "0") return false;
  return true;
}

export async function startWorkers(): Promise<Worker[]> {
  if (started) return workers;
  if (!shouldStartWorkers()) {
    console.log("[queue] workers skipped (QUEUE_WORKERS=0 or NODE_ENV=test)");
    return [];
  }

  workers = [
    new Worker<DispatchJobData>(QUEUE_NAMES.dispatch, processDispatch, {
      connection: queueConnection,
      concurrency: 5,
    }),
    new Worker<AuctionCloseJobData>(QUEUE_NAMES.auctionClose, processAuctionClose, {
      connection: queueConnection,
      concurrency: 5,
    }),
    new Worker<NotifyJobData>(QUEUE_NAMES.notify, processNotify, {
      connection: queueConnection,
      concurrency: 10,
    }),
    new Worker<PspReconcileJobData>(QUEUE_NAMES.pspReconcile, processPspReconcile, {
      connection: queueConnection,
      concurrency: 2,
    }),
  ];

  for (const w of workers) {
    w.on("failed", (job, err) => {
      console.error(`[queue:${w.name}] failed job=${job?.id}:`, err.message);
    });
  }

  started = true;
  console.log(
    `[queue] workers started: ${workers.map((w) => w.name).join(", ")}`,
  );
  return workers;
}

export async function stopWorkers(): Promise<void> {
  if (!workers.length) return;
  await Promise.all(workers.map((w) => w.close()));
  workers = [];
  started = false;
  console.log("[queue] workers stopped");
}
