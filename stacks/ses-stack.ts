import * as cdk from "aws-cdk-lib";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { EmailIdentity } from "aws-cdk-lib/aws-ses";
import { Construct } from "constructs";
import { Account, CDStackProps } from "../bin/create-data-infra";

interface SesStackProps extends CDStackProps {
    hostedZone: HostedZone;
    domain: string;
    account: Account;
}

export class SesStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: SesStackProps) {
        super(scope, id, props);

        new EmailIdentity(this, `cd-infra-${props.account.toLowerCase().replace("_", "-")}-verified-domain`, {
            identity: {
                value: props.domain,
                hostedZone: props.hostedZone,
            },
        });
    }
}
