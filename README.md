# Create Data Infra

This repo contains shared or reusable IaC to be deployed across the Create Data AWS Accounts


## Deploying changes (manual CDK deploy)

When a PR is merged there is no automated pipeline for deploying these stacks, so deployment must be performed manually using the AWS CDK.

Checklist
- Ensure the PR is merged to the branch you will deploy from (usually `main`).
- Pull the latest code locally: `git checkout main && git pull origin main`.
- Confirm you have the required prerequisites (below).

Prerequisites
- Node.js and pnpm (this repo enforces pnpm via `preinstall`).
- AWS CLI configured with credentials that can deploy CloudFormation/CDK (or an AWS profile you can assume).
- Optional: the `aws-cdk` CLI installed globally, although you can run CDK via the included script (`pnpm cdk`).

Quick deploy steps
1. Install dependencies and build the app:

```bash
pnpm install
pnpm build
```

2. Set the AWS profile and required environment variables for the deployment. The CDK app reads the following env vars:

- `ACCOUNT` — one of: `AUDIT`, `LOG_ARCHIVE`, `SHARED_SERVICES`, `SECURITY_SERVICES`, `REF_DATA`, `DISRUPTIONS`, `SANDBOX`.
- `DOMAIN` — required for stacks that create DNS / SES resources (e.g. `SHARED_SERVICES`, `REF_DATA`, `DISRUPTIONS`).
- `STAGE` — required for `REF_DATA` and `DISRUPTIONS` (one of `TEST`, `PREPROD`, `PROD`).
- `INCLUDE_USEAST1` — set (any non-empty value) to include the US East (us-east-1) bootstrap stack.

Example (bootstrap stack only):

```bash
export ACCOUNT=DISRUPTIONS
export STAGE=TEST
export DOMAIN=test.cdd.dft-create-data.com
pnpm cdk deploy cd-infra-bootstrap-stack
```

Helpful commands
- See what will change before deploying:

```bash
pnpm cdk diff <stack-id> --profile $AWS_PROFILE
```

- Save stack outputs to a file when deploying:

```bash
pnpm cdk deploy <stack-id> --outputs-file cdk-outputs.json --profile $AWS_PROFILE
```

Notes and troubleshooting
- The CDK app sets specific stack IDs; use the IDs declared in `bin/create-data-infra.ts` (for example `cd-infra-bootstrap-stack`, `cd-infra-shared-services-dns-stack`, `cd-infra-shared-services-ses-stack`, `cd-infra-ref-data-dns-stack`, `cd-infra-ref-data-ses-stack`, `cd-infra-cdd-dns-stack`, `cd-infra-disruptions-ses-stack`).
- Make sure your AWS credentials/profile has permissions to create roles, policies, S3 buckets, CloudFormation stacks and (for SES) verify domains.
- Use `pnpm cdk synth` and `pnpm cdk diff` to validate changes locally before running `cdk deploy`.


