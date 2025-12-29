import type { PageServerLoad } from './$types';
import { listJobsForUser } from '$lib/server/aws/dynamo';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return { jobs: [], error: null };
  }

  const { items, error } = await listJobsForUser(user.sub);
  return {
    jobs: items,
    error: error ?? null,
  };
};
