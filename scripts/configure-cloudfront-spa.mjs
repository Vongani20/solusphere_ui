import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID || "E3T54WTSRX8AS0";
const functionName = process.env.CLOUDFRONT_SPA_FUNCTION_NAME || "solusphere-spa-router";
const functionCodePath = path.join(__dirname, "cloudfront-spa-router.js");

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.status !== 0 && !allowFailure) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }

  return result.stdout;
}

function parseJson(stdout, label) {
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(`Failed to parse ${label}`);
  }
}

function upsertFunction() {
  const describe = run("aws", ["cloudfront", "describe-function", "--name", functionName], {
    allowFailure: true,
  });

  const functionConfigPath = path.join(__dirname, "cloudfront-function-config.json");
  fs.writeFileSync(
    functionConfigPath,
    JSON.stringify({
      Comment: "SPA route rewrite",
      Runtime: "cloudfront-js-2.0",
    })
  );
  const functionConfigArg = `file://${functionConfigPath.replace(/\\/g, "/")}`;
  const functionCodeArg = `fileb://${functionCodePath.replace(/\\/g, "/")}`;

  if (describe) {
    const current = parseJson(describe, "function metadata");
    console.log(`Updating CloudFront function ${functionName}...`);
    run("aws", [
      "cloudfront",
      "update-function",
      "--name",
      functionName,
      "--if-match",
      current.ETag,
      "--function-config",
      functionConfigArg,
      "--function-code",
      functionCodeArg,
    ]);

    const updated = parseJson(
      run("aws", ["cloudfront", "describe-function", "--name", functionName]),
      "updated function metadata"
    );

    run("aws", [
      "cloudfront",
      "publish-function",
      "--name",
      functionName,
      "--if-match",
      updated.ETag,
    ]);

    const published = parseJson(
      run("aws", ["cloudfront", "describe-function", "--name", functionName]),
      "published function metadata"
    );
    return published.FunctionSummary.FunctionMetadata.FunctionARN;
  }

  console.log(`Creating CloudFront function ${functionName}...`);
  const created = parseJson(
    run("aws", [
      "cloudfront",
      "create-function",
      "--name",
      functionName,
      "--function-config",
      functionConfigArg,
      "--function-code",
      functionCodeArg,
    ]),
    "created function"
  );

  run("aws", [
    "cloudfront",
    "publish-function",
    "--name",
    functionName,
    "--if-match",
    created.ETag,
  ]);

  const published = parseJson(
    run("aws", ["cloudfront", "describe-function", "--name", functionName]),
    "published function metadata"
  );
  return published.FunctionSummary.FunctionMetadata.FunctionARN;
}

const functionArn = upsertFunction();
const raw = run("aws", ["cloudfront", "get-distribution-config", "--id", distributionId]);
const parsed = parseJson(raw, "distribution config");
const etag = parsed.ETag;
const config = parsed.DistributionConfig;

config.CustomErrorResponses = { Quantity: 0 };

const defaultBehavior = config.DefaultCacheBehavior;
defaultBehavior.FunctionAssociations = {
  Quantity: 1,
  Items: [
    {
      FunctionARN: functionArn,
      EventType: "viewer-request",
    },
  ],
};

const configPath = path.join(__dirname, "cf-update.json");
fs.writeFileSync(configPath, JSON.stringify(config));

console.log("Updating CloudFront distribution (SPA router function, no asset HTML fallback)...");
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
const invalidation = parseJson(
  run("aws", [
    "cloudfront",
    "create-invalidation",
    "--distribution-id",
    distributionId,
    "--paths",
    "/*",
  ]),
  "invalidation response"
);

console.log("Invalidation started:", invalidation.Invalidation?.Id || "(unknown)");
console.log("CloudFront SPA routing fix applied.");
