import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const region = "us-east-1";
const aclName = process.env.WAF_ACL_NAME || "CreatedByCloudFront-a2f93c77";
const aclId = process.env.WAF_ACL_ID || "4e93a634-174a-4bbb-971d-599b942b36b8";

const uploadPaths = [
  "/api/auth/face-login",
  "/api/upload-face",
  "/api/face/register",
  "/api/face/update",
  "/api/cv/photo",
  "/api/bpo/analyze-pdf",
  "/api/upload",
];

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

function uploadPathExclusionStatement() {
  return {
    NotStatement: {
      Statement: {
        OrStatement: {
          Statements: uploadPaths.map((uploadPath) => ({
            ByteMatchStatement: {
              SearchString: uploadPath,
              FieldToMatch: { UriPath: {} },
              TextTransformations: [{ Priority: 0, Type: "LOWERCASE" }],
              PositionalConstraint: "STARTS_WITH",
            },
          })),
        },
      },
    },
  };
}

const raw = run("aws", [
  "wafv2",
  "get-web-acl",
  "--name",
  aclName,
  "--scope",
  "CLOUDFRONT",
  "--id",
  aclId,
  "--region",
  region,
]);

const parsed = JSON.parse(raw);
const { WebACL, LockToken } = parsed;
const scopeDown = uploadPathExclusionStatement();

const rules = WebACL.Rules.map((rule) => {
  const managed = rule.Statement?.ManagedRuleGroupStatement;
  if (!managed) return rule;

  return {
    ...rule,
    Statement: {
      ManagedRuleGroupStatement: {
        ...managed,
        ScopeDownStatement: scopeDown,
      },
    },
  };
});

const updatePayload = {
  Name: WebACL.Name,
  Scope: "CLOUDFRONT",
  Id: aclId,
  LockToken,
  DefaultAction: WebACL.DefaultAction,
  Description: WebACL.Description || "CloudFront WAF",
  Rules: rules,
  VisibilityConfig: WebACL.VisibilityConfig,
};

const payloadPath = path.join(__dirname, "waf-update.json");
fs.writeFileSync(payloadPath, JSON.stringify(updatePayload));

console.log("Updating WAF ACL to allow multipart uploads on face/CV/file endpoints...");

run("aws", [
  "wafv2",
  "update-web-acl",
  "--name",
  aclName,
  "--scope",
  "CLOUDFRONT",
  "--id",
  aclId,
  "--region",
  region,
  "--lock-token",
  LockToken,
  "--cli-input-json",
  `file://${payloadPath.replace(/\\/g, "/")}`,
]);

console.log("WAF upload exclusions applied.");
