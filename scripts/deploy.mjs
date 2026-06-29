import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");
const bucket = process.env.S3_BUCKET || "solusphere-ui";

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${filePath}`);
  }

  const vars = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    vars[key] = value;
  }
  return vars;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: options.env || process.env,
    cwd: options.cwd,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const env = loadEnv(envPath);
const buildEnv = {
  ...process.env,
  ...env,
};

console.log(`Building with VITE_API_BASE_URL=${buildEnv.VITE_API_BASE_URL || "(not set)"}`);
run("npm", ["run", "build"], { cwd: root, env: buildEnv });

const dist = path.join(root, "dist");
if (!fs.existsSync(dist)) {
  throw new Error("Build output not found at dist/");
}

console.log(`Deploying dist/ to s3://${bucket} ...`);

run("aws", [
  "s3",
  "sync",
  dist,
  `s3://${bucket}`,
  "--exclude",
  "index.html",
  "--cache-control",
  "public,max-age=31536000,immutable",
], { env: buildEnv });

run("aws", [
  "s3",
  "cp",
  path.join(dist, "index.html"),
  `s3://${bucket}/index.html`,
  "--cache-control",
  "no-cache,no-store,must-revalidate",
  "--content-type",
  "text/html",
], { env: buildEnv });

console.log("Configuring static website hosting for SPA routing...");
run("aws", [
  "s3",
  "website",
  bucket,
  "--index-document",
  "index.html",
  "--error-document",
  "index.html",
], { env: buildEnv });

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "eu-west-1";
console.log(`\nDeployed to s3://${bucket}`);
console.log(`Website: http://${bucket}.s3-website-${region}.amazonaws.com`);
console.log(`CloudFront: https://d22snf4es6f4ui.cloudfront.net`);

const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID || "E3T54WTSRX8AS0";
console.log("Invalidating CloudFront cache...");
run(
  "aws",
  ["cloudfront", "create-invalidation", "--distribution-id", distributionId, "--paths", "/*"],
  { env: buildEnv }
);
