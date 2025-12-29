import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { createJob } from '$lib/server/aws/dynamo';
import { createUploadUrl } from '$lib/server/aws/s3';

const statusIssued = 'PRESIGNED_ISSUED';

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/]/g, '_');
}

export const load: PageServerLoad = async () => {
  return { status: 'idle' };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const data = await request.formData();
    const filename = data.get('filename');
    const contentType = data.get('contentType');

    if (!filename || typeof filename !== 'string') {
      return fail(400, { error: 'Filename is required' });
    }

    const safeFilename = sanitizeFilename(filename);
    const jobId = randomUUID();
    const uploadKey = `files/uploaded/${jobId}/${safeFilename}`;
    const now = new Date().toISOString();

    const { url, error: urlError } = await createUploadUrl({
      key: uploadKey,
      contentType: typeof contentType === 'string' && contentType.length > 0
        ? contentType
        : 'application/octet-stream',
    });

    if (!url) {
      return fail(500, { error: urlError ?? 'Failed to create upload URL' });
    }

    const { error: jobError } = await createJob({
      userSub: user.sub,
      jobId,
      filename: safeFilename,
      uploadKey,
      status: statusIssued,
      createdAt: now,
      updatedAt: now,
    });

    if (jobError) {
      return fail(500, { error: jobError });
    }

    return {
      uploadUrl: url,
      jobId,
      uploadKey,
    };
  },
};
