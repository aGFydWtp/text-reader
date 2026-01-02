import { listJobsForUser } from "$lib/server/aws/dynamo";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return { jobs: [], error: null };
  }

  const { items, error } = await listJobsForUser(user.sub);
  const jobs = items.map((item) => {
    const jobId =
      item.id ??
      (typeof item.sk === "string" && item.sk.startsWith("JOB#") ? item.sk.slice(4) : item.sk);
    return { ...item, jobId };
  });

  return {
    jobs,
    error: error ?? null,
  };
};
