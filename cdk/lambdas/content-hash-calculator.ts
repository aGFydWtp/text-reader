import type { CloudFrontRequestEvent, CloudFrontRequestHandler } from "aws-lambda";

/**
 * Calculate SHA256 hash of request payload for POST/PUT requests
 * This hash is added to the x-amz-content-sha256 header for Origin Access Control (OAC) authentication
 */
const hashPayload = async (payload: string): Promise<string> => {
  const encoder = new TextEncoder().encode(payload);
  const hash = await crypto.subtle.digest("SHA-256", encoder);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map((bytes) => bytes.toString(16).padStart(2, "0")).join("");
};

export const handler: CloudFrontRequestHandler = async (event: CloudFrontRequestEvent) => {
  const request = event.Records[0].cf.request;

  // Process POST/PUT/DELETE requests
  const needsHash = ["POST", "PUT", "DELETE"].includes(request.method);
  if (!needsHash) {
    return request;
  }

  // Handle requests with or without body data
  let decodedBody = "";

  if (request.body?.data) {
    const body = request.body.data;
    const encoding = request.body.encoding;

    decodedBody = encoding === "base64" ? Buffer.from(body, "base64").toString("utf-8") : body;
  }

  // Calculate SHA256 hash of the request body
  const contentHash = await hashPayload(decodedBody);

  // Add the content hash header for OAC authentication
  request.headers["x-amz-content-sha256"] = [{ key: "x-amz-content-sha256", value: contentHash }];

  return request;
};
