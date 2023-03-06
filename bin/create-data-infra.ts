#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as dotenv from "dotenv";
import { BootstrapStack } from "../stacks/bootstrap-stack";
import { DnsStack as SharedDnsStack } from "../stacks/shared-services/dns-stack";
import { SesStack } from "../stacks/shared-services/ses-stack";

dotenv.config();

export enum Account {
    AUDIT = "AUDIT",
    LOG_ARCHIVE = "LOG_ARCHIVE",
    SHARED_SERVICES = "SHARED_SERVICES",
    SECURITY_SERVICES = "SECURITY_SERVICES",
    REF_DATA = "REF_DATA",
    DISRUPTIONS = "DISRUPTIONS",
    SANDBOX = "SANDBOX",
}

export enum Stage {
    TEST = "TEST",
    PREPROD = "PREPROD",
    PROD = "PROD",
}

export interface CDStackProps extends cdk.StackProps {
    account: Account;
    stage?: Stage;
    env: {
        account: string | undefined;
        region: string;
    };
}

const { ACCOUNT: account, DOMAIN: domain, INCLUDE_USEAST1: includeUsEast1, STAGE: stage } = process.env;
const isValidAccount = (input: string): input is Account => input in Account;
const isValidStage = (input?: string): input is Stage => !!input && input in Stage;

if (!account || !isValidAccount(account)) {
    throw new Error(`ACCOUNT env var must be provided as one of: ${Object.keys(Account).join(", ")}`);
}

const app = new cdk.App();

new BootstrapStack(app, "cd-infra-bootstrap-stack", {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "eu-west-2" },
    account,
    stage: isValidStage(stage) ? stage : undefined,
});

if (includeUsEast1) {
    new BootstrapStack(app, "cd-infra-bootstrap-stack-us-east-1", {
        env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "us-east-1" },
        account,
        stage: isValidStage(stage) ? stage : undefined,
    });
}

if (account === Account.SHARED_SERVICES) {
    if (!domain) {
        throw new Error("DOMAIN env var must be set");
    }

    const dnsStack = new SharedDnsStack(app, "cd-infra-shared-services-dns-stack", {
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
