# AWS S3 Hosting

This frontend is a Vite static app. The production files are generated in `dist/` and can be hosted from an S3 static website bucket.

## One-time AWS setup

Configure AWS CLI credentials on this machine:

```powershell
aws configure
```

Recommended region for this project:

```text
eu-west-1
```

## Deploy

Choose a globally unique bucket name, then run:

```powershell
npm run deploy:s3 -- -BucketName solusphere-ui-your-name -Region eu-west-1
```

With an AWS profile:

```powershell
npm run deploy:s3 -- -BucketName solusphere-ui-your-name -Region eu-west-1 -Profile default
```

The script:

- Builds the frontend with `VITE_API_BASE_URL=/api`
- Creates the S3 bucket if it does not exist
- Enables static website hosting
- Adds public read access for website files
- Uploads `dist/` to S3
- Sets long cache headers for hashed assets
- Sets `index.html` to `no-cache` for clean app updates
- Uses `index.html` as the error document so React routes work on refresh

## Website URL

After deployment, the URL will be:

```text
http://BUCKET_NAME.s3-website-eu-west-1.amazonaws.com
```

For camera login, use the HTTPS CloudFront URL instead of the plain S3 website URL:

```text
https://d22snf4es6f4ui.cloudfront.net
```

## Important API note

Camera access only works on HTTPS or localhost. The S3 website endpoint is HTTP, so facial login must use CloudFront.

The frontend is built to call:

```text
/api
```

CloudFront must route `/api/*` to the backend origin:

```text
ec2-3-250-102-248.eu-west-1.compute.amazonaws.com:2080
```

It should also route `/uploads/*` to the backend origin so uploaded event/profile media loads from the HTTPS site without mixed-content blocking.
