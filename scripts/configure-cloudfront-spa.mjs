import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID || "E3T54WTSRX8AS0";

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }

  return result.stdout;
}

const raw = run("aws", ["cloudfront", "get-distribution-config", "--id", distributionId]);
const parsed = JSON.parse(raw);
const etag = parsed.ETag;
const config = parsed.DistributionConfig;

config.CustomErrorResponses = {
  Quantity: 2,
  Items: [
    {
      ErrorCode: 403,
      ResponsePagePath: "/index.html",
      ResponseCode: "200",
      ErrorCachingMinTTL: 10,
    },
    {
      ErrorCode: 404,
      ResponsePagePath: "/index.html",
      ResponseCode: "200",
      ErrorCachingMinTTL: 10,
    },
  ],
};

const configPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "cf-update.json");
fs.writeFileSync(configPath, JSON.stringify(config));

console.log("Updating CloudFront SPA error responses...");
run("aws", [
  "cloudfront",
  "update-distribution",
  "--id",
  distributionId,
  "--if-match",
  etag,
  "--distribution-config",
  `file://${configPath.replace(/\\/g, "/")}`,
]);

console.log("Creating CloudFront invalidation...");
const invalidation = JSON.parse(
  run("aws", [
    "cloudfront",
    "create-invalidation",
    "--distribution-id",
    distributionId,
    "--paths",
    "/*",
  ])
);

console.log(
  "Invalidation started:",
  invalidation.Invalidation?.Id || "(unknown)"
);
console.log("CloudFront SPA routing fix applied.");