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
    shell: false,
  });

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }

  return result.stdout;
}

function writeJson(name, value) {
  const filePath = path.join(__dirname, name);
  fs.writeFileSync(filePath, JSON.stringify(value));
  return filePath;
}

function uploadPathExclusionStatement() {
  return {
    NotStatement: {
      Statement: {
        OrStatement: {
          Statements: uploadPaths.map((uploadPath) => ({
            ByteMatchStatement: {
              SearchString: Buffer.from(uploadPath, "utf8").toString("base64"),
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

const rulesPath = writeJson("waf-rules.json", rules);
const defaultActionPath = writeJson("waf-default-action.json", WebACL.DefaultAction);
const visibilityPath = writeJson("waf-visibility.json", WebACL.VisibilityConfig);

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
  "--default-action",
  `file://${defaultActionPath.replace(/\\/g, "/")}`,
  "--description",
  WebACL.Description || "CloudFront WAF",
  "--visibility-config",
  `file://${visibilityPath.replace(/\\/g, "/")}`,
  "--rules",
  `file://${rulesPath.replace(/\\/g, "/")}`,
]);

console.log("WAF upload exclusions applied.");
