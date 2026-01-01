import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { createDownloadUrl } from '$lib/server/aws/s3';
import { getJobForUser, updateJobDictionary } from '$lib/server/aws/dynamo';
import { invokeTtsStart } from '$lib/server/aws/lambda';

function toDictEntries(fileDict: Record<string, string> | undefined) {
  const entries = Object.entries(fileDict ?? {}).map(([key, value]) => ({ key, value }));
  return entries.length > 0 ? entries : [{ key: '', value: '' }];
}

export const load: PageServerLoad = async ({ locals, params }) => {
  const user = locals.user;
  if (!user) {
    throw error(401, 'Unauthorized');
  }

  const jobId = params.jobId;
  const { job, error: jobError } = await getJobForUser({ userSub: user.sub, jobId });
  if (jobError) {
    throw error(500, jobError);
  }
  if (!job) {
    throw error(404, 'Job not found');
  }

  let audioUrl: string | null = null;
  if (job.latestAudioKey) {
    const { url } = await createDownloadUrl({ key: job.latestAudioKey });
    audioUrl = url ?? null;    
  }

  return {
    job: {
      ...job,
      id: job.id ?? jobId,
    },
    audioUrl,
    dictEntries: toDictEntries(job.fileDict),
  };
};

export const actions: Actions = {
  default: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { error: 'Unauthorized' });
    }

    const jobId = params.jobId;
    const formData = await request.formData();
    const keys = formData.getAll('dictKey').map((value) => String(value));
    const values = formData.getAll('dictValue').map((value) => String(value));

    const fileDict: Record<string, string> = {};
    keys.forEach((key, index) => {
      const normalizedKey = key.trim();
      const normalizedValue = (values[index] ?? '').trim();
      if (!normalizedKey && !normalizedValue) return;
      if (!normalizedKey) return;
      fileDict[normalizedKey] = normalizedValue;
    });

    const { error: updateError } = await updateJobDictionary({
      userSub: user.sub,
      jobId,
      fileDict,
    });

    if (updateError) {
      return fail(500, { error: updateError });
    }

    const { error: invokeError } = await invokeTtsStart(jobId);
    if (invokeError) {
      return { success: true, warning: invokeError };
    }

    return { success: true, started: true };
  },
};
