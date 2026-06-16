import { ROOT_BASE_URL } from "../services/api";

function encodeS3Key(key) {
  return key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function joinUrl(baseUrl, key) {
  return `${baseUrl.replace(/\/+$/, "")}/${encodeS3Key(key.replace(/^\/+/, ""))}`;
}

function s3ObjectUrl(bucket, key, region) {
  if (!bucket || !key) return "";
  const host = region ? `${bucket}.s3.${region}.amazonaws.com` : `${bucket}.s3.amazonaws.com`;
  return `https://${host}/${encodeS3Key(key)}`;
}

export function resolveImageUrl(value) {
  if (!value) return "";

  const raw = String(value).trim().replace(/\\/g, "/");
  if (!raw) return "";

  try {
    const url = new URL(raw);
    const isBackendUpload =
      url.protocol === "http:" &&
      url.port === "2080" &&
      (url.hostname === "3.250.102.248" || url.hostname === "ec2-3-250-102-248.eu-west-1.compute.amazonaws.com");

    if (isBackendUpload) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // Non-URL values are handled below.
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (raw.startsWith("s3://")) {
    const [, bucketAndKey = ""] = raw.split("s3://");
    const [bucket, ...keyParts] = bucketAndKey.split("/");
    return s3ObjectUrl(bucket, keyParts.join("/"), import.meta.env.VITE_AWS_REGION);
  }

  const publicBaseUrl = import.meta.env.VITE_S3_PUBLIC_BASE_URL;
  if (publicBaseUrl) {
    return joinUrl(publicBaseUrl, raw);
  }

  const bucket = import.meta.env.VITE_AWS_BUCKET_NAME;
  if (bucket && !raw.startsWith("/") && !raw.match(/^[a-zA-Z]:\//)) {
    return s3ObjectUrl(bucket, raw, import.meta.env.VITE_AWS_REGION);
  }

  if (raw.startsWith("/")) {
    return `${ROOT_BASE_URL}${raw}`;
  }

  return `${ROOT_BASE_URL}/${raw.replace(/^\.?\//, "")}`;
}
