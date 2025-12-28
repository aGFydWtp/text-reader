import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (
  _event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
    body: 'Frontend placeholder. Replace with SvelteKit SSR.',
  };
};
