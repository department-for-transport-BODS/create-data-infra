#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as dotenv from "dotenv";
import { BootstrapStack } from "../stacks/bootstrap-stack";
import { DnsStack } from "../stacks/shared-services/dns-stack";
import { SesStack } from "../stacks/shared-services/ses-stack";

dotenv.config();

export enum Account {
    AUDIT = "AUDIT",
    LOG_ARCHIVE = "LOG_ARCHIVE",
    SHARED_SERVICES = "SHARED_SERVICES",
    SECURITY_SERVICES = "SECURITY_SERVICES",
    REF_DATA_TEST = "REF_DATA_TEST",
    REF_DATA_PREPROD = "REF_DATA_PREPROD",
    REF_DATA_PROD = "REF_DATA_PROD",
    DISRUPTIONS_TEST = "DISRUPTIONS_TEST",
    DISRUPTIONS_PREPROD = "DISRUPTIONS_PREPROD",
    DISRUPTIONS_PROD = "DISRUPTIONS_PROD",
    SANDBOX = "SANDBOX",
}

export interface CDStackProps extends cdk.StackProps {
    account: Account;
    env: {
        account: string | undefined;
        region: string;
    };
}

const { ACCOUNT: account, DOMAIN: domain } = process.env;
const isValidAccount = (input: string): input is Account => input in Account;

if (!account || !isValidAccount(account)) {
    throw new Error(`ACCOUNT env var must be provided as one of: ${Object.keys(Account).join(", ")}`);
}

const app = new cdk.App();

new BootstrapStack(app, "cd-infra-bootstrap-stack", {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "eu-west-2" },
    account,
});

if (account === Account.SHARED_SERVICES) {
    if (!domain) {
        throw new Error("DOMAIN env var must be set");
    }

    new BootstrapStack(app, "cd-infra-bootstrap-stack-us-east-1", {
        env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "us-east-1" },
        account,
    });

    const dnsStack = new DnsStack(app, "cd-infra-shared-services-dns-stack", {
        env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "us-east-1" },
        account,
        domain,
    });

    new SesStack(app, "cd-infra-shared-services-ses-stack", {
        env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "us-east-1" },
        account,
        domain,
        hostedZone: dnsStack.hostedZone,
    });
}
