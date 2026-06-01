import { processPendingSyncTasks } from "../../lib/sync-tasks";

export const config = {
  schedule: "* * * * *",
};

export default async function syncHubSpotScheduledFunction(request: Request) {
  const payload = await request
    .json()
    .catch(() => ({ next_run: null as string | null }));

  try {
    const result = await processPendingSyncTasks();

    console.info(
      `[netlify-sync-hubspot] next_run=${payload.next_run ?? "unknown"} result=${JSON.stringify(result)}`,
    );
  } catch (error) {
    console.error("[netlify-sync-hubspot] error:", error);
    throw error;
  }

  return new Response(null, { status: 204 });
}
