#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { BootstrapStack } from "../stacks/bootstrap-stack";

export enum AccountType {
    AUDIT = "AUDIT",
    LOG_ARCHIVE = "LOG_ARCHIVE",
    SHARED_SERVICES = "SHARED_SERVICES",
    SECURITY_SERVICES = "SECURITY_SERVICES",
    REF_DATA = "REF_DATA",
    DISRUPTIONS = "DISRUPTIONS",
    SANDBOX = "SANDBOX",
}

export interface CDStackProps extends cdk.StackProps {
    accountType: AccountType;
    env: {
        account: string | undefined;
        region: string;
    };
}

const { ACCOUNT_TYPE: accountType } = process.env;
const isValidAccountType = (input: string): input is AccountType => input in AccountType;

if (!accountType || !isValidAccountType(accountType)) {
    throw new Error(`ACCOUNT_TYPE env var must be provided as one of: ${Object.keys(AccountType).join(", ")}`);
}

const app = new cdk.App();

new BootstrapStack(app, "cd-infra-bootstrap-stack", {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "eu-west-2" },
    accountType,
});
