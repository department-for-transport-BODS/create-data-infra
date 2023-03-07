import * as cdk from "aws-cdk-lib";
import { HostedZone, MxRecord } from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";
import { CDStackProps } from "../bin/create-data-infra";

interface DnsStackProps extends CDStackProps {
    domain: string;
    createMxRecord?: boolean;
}

export class DnsStack extends cdk.Stack {
    public readonly hostedZone: HostedZone;

    constructor(scope: Construct, id: string, props: DnsStackProps) {
        super(scope, id, props);

        const createDataHostedZone = new HostedZone(this, "cd-infra-root-hosted-zone", {
            zoneName: props.domain,
        });

        if (props.createMxRecord) {
            new MxRecord(this, "cd-infra-mx-record", {
                zone: createDataHostedZone,
                values: [
                    {
                        hostName: "inbound-smtp.us-east-1.amazonaws.com",
                        priority: 10,
                    },
                ],
            });
        }

        this.hostedZone = createDataHostedZone;
    }
}
