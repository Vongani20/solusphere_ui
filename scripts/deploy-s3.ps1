param(
  [Parameter(Mandatory = $true)]
  [string] $BucketName,

  [string] $Region = "eu-west-1",

  [string] $Profile = "",

  [string] $ApiBaseUrl = "/api",

  [string] $CloudFrontDistributionId = "",

  [switch] $SkipBucketSetup
)

$ErrorActionPreference = "Stop"

function Invoke-Aws {
  param(
    [Parameter(Mandatory = $true)]
    [string[]] $Arguments
  )

  $profileArgs = @()
  if ($Profile) {
    $profileArgs = @("--profile", $Profile)
  }

  & aws @profileArgs @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "AWS CLI command failed: aws $($Arguments -join ' ')"
  }
}

function Write-JsonFile {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Name,

    [Parameter(Mandatory = $true)]
    [object] $Value
  )

  $path = Join-Path $env:TEMP $Name
  $json = $Value | ConvertTo-Json -Depth 10
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($path, $json, $utf8NoBom)
  return $path
}

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw "AWS CLI is required. Install or configure AWS CLI v2 before deploying."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm is required to build the frontend before deploying."
}

Write-Host "Checking AWS identity..."
Invoke-Aws -Arguments @("sts", "get-caller-identity", "--region", $Region) *> $null

Write-Host "Building SoluSphere UI for S3..."
$env:VITE_API_BASE_URL = $ApiBaseUrl
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
  throw "Frontend build failed."
}

if (-not $SkipBucketSetup) {
  $bucketExists = $false
  try {
    Invoke-Aws -Arguments @("s3api", "head-bucket", "--bucket", $BucketName) *> $null
    $bucketExists = $true
  } catch {
    $bucketExists = $false
  }

  if (-not $bucketExists) {
    Write-Host "Creating S3 bucket $BucketName in $Region..."
    if ($Region -eq "us-east-1") {
      Invoke-Aws -Arguments @("s3api", "create-bucket", "--bucket", $BucketName, "--region", $Region)
    } else {
      Invoke-Aws -Arguments @(
        "s3api",
        "create-bucket",
        "--bucket",
        $BucketName,
        "--region",
        $Region,
        "--create-bucket-configuration",
        "LocationConstraint=$Region"
      )
    }
  } else {
    Write-Host "Using existing S3 bucket $BucketName."
  }

  $ownershipControlsPath = Write-JsonFile -Name "$BucketName-ownership-controls.json" -Value @{
    Rules = @(
      @{
        ObjectOwnership = "BucketOwnerEnforced"
      }
    )
  }

  $publicAccessPath = Write-JsonFile -Name "$BucketName-public-access.json" -Value @{
    BlockPublicAcls       = $false
    IgnorePublicAcls      = $false
    BlockPublicPolicy     = $false
    RestrictPublicBuckets = $false
  }

  $policyPath = Write-JsonFile -Name "$BucketName-policy.json" -Value @{
    Version   = "2012-10-17"
    Statement = @(
      @{
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = @("s3:GetObject")
        Resource  = "arn:aws:s3:::$BucketName/*"
      }
    )
  }

  $websitePath = Write-JsonFile -Name "$BucketName-website.json" -Value @{
    IndexDocument = @{
      Suffix = "index.html"
    }
    ErrorDocument = @{
      Key = "index.html"
    }
  }

  Write-Host "Configuring static website hosting..."
  Invoke-Aws -Arguments @("s3api", "put-bucket-ownership-controls", "--bucket", $BucketName, "--ownership-controls", "file://$ownershipControlsPath")
  Invoke-Aws -Arguments @("s3api", "put-public-access-block", "--bucket", $BucketName, "--public-access-block-configuration", "file://$publicAccessPath")
  Invoke-Aws -Arguments @("s3api", "put-bucket-policy", "--bucket", $BucketName, "--policy", "file://$policyPath")
  Invoke-Aws -Arguments @("s3api", "put-bucket-website", "--bucket", $BucketName, "--website-configuration", "file://$websitePath")
}

Write-Host "Uploading build files to S3..."
Invoke-Aws -Arguments @(
  "s3",
  "sync",
  "dist",
  "s3://$BucketName",
  "--delete",
  "--exclude",
  "index.html",
  "--cache-control",
  "public,max-age=31536000,immutable"
)

Invoke-Aws -Arguments @(
  "s3",
  "cp",
  "dist/index.html",
  "s3://$BucketName/index.html",
  "--cache-control",
  "no-cache",
  "--content-type",
  "text/html"
)

$websiteUrl = "http://$BucketName.s3-website-$Region.amazonaws.com"
Write-Host ""
Write-Host "S3 website deployed:"
Write-Host $websiteUrl
Write-Host ""
Write-Host "If login/API calls fail, add this S3 website origin to the backend CORS allowlist."

if ($CloudFrontDistributionId) {
  Write-Host ""
  Write-Host "Invalidating CloudFront distribution $CloudFrontDistributionId..."
  Invoke-Aws -Arguments @("cloudfront", "create-invalidation", "--distribution-id", $CloudFrontDistributionId, "--paths", "/*") *> $null
  Write-Host "CloudFront invalidation created."
}
