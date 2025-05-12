import * as cdk from "aws-cdk-lib";
import { Duration } from "aws-cdk-lib";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { EmailIdentity, ReceiptRuleSet } from "aws-cdk-lib/aws-ses";
import * as actions from "aws-cdk-lib/aws-ses-actions";
import { Statement } from "cdk-iam-floyd";
import { Construct } from "constructs";
import { CDStackProps } from "../../bin/create-data-infra";

interface SesStackProps extends CDStackProps {
    hostedZone: HostedZone;
    domain: string;
}

export class SesStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: SesStackProps) {
        super(scope, id, props);

        const emailBucket = new Bucket(this, "cd-infra-ses-email-forward-bucket", {
            bucketName: "dft-cd-email-forward-bucket",
            blockPublicAccess: {
                blockPublicAcls: true,
                blockPublicPolicy: true,
                ignorePublicAcls: true,
                restrictPublicBuckets: true,
            },
            encryption: BucketEncryption.S3_MANAGED,
        });

        const emailForwarderFunctionRolePolicy = new ManagedPolicy(
            this,
            "cd-infra-email-forwarder-lambda-role-policy",
            {
                statements: [
                    new Statement.Logs().allow().toCreateLogStream().toCreateLogGroup().toPutLogEvents(),
                    new Statement.S3().allow().toGetObject().toPutObject().onObject(emailBucket.bucketName, "*"),
                    new Statement.Ses().allow().toSendRawEmail().on(`arn:aws:ses:us-east-1:${this.account}:identity/*`),
                ],
            },
        );

        const emailForwarderFunctionRole = new Role(this, "cd-infra-email-forwarder-lambda-role", {
            assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
            managedPolicies: [emailForwarderFunctionRolePolicy],
        });

        const emailForwarderFunction = new NodejsFunction(this, "cd-infra-email-forwarder-lambda", {
            functionName: "cd-infra-email-forwarder",
            entry: "./lambdas/email-forwarder/index.js",
            handler: "handler",
            runtime: Runtime.NODEJS_18_X,
            role: emailForwarderFunctionRole,
            timeout: Duration.seconds(20),
            environment: {
                MAIL_RECIPIENTS: process.env.MAIL_RECIPIENT || "",
                MAIL_S3_BUCKET: emailBucket.bucketName,
                MAIL_S3_PREFIX: "",
                MAIL_SENDER: `noreply@${props.domain}`,
                REGION: "us-east-1",
            },
        });

        const ruleSet = new ReceiptRuleSet(this, "cd-infra-create-data-email-rule-set", {
            receiptRuleSetName: "dft-create-data-com",
        });

        ruleSet.addRule("cd-infra-create-data-email-rule", {
            receiptRuleName: "dft-create-data-emails",
            recipients: [props.domain],
            actions: [
                new actions.S3({
                    bucket: emailBucket,
                }),
                new actions.Lambda({
                    function: emailForwarderFunction,
                    invocationType: actions.LambdaInvocationType.EVENT,
                }),
            ],
        });

        new EmailIdentity(this, "cd-infra-verified-domain", {
            identity: {
                value: props.domain,
                hostedZone: props.hostedZone,
            },
        });

        new EmailIdentity(this, "cd-infra-verified-email", {
            identity: {
                value: `noreply@${props.domain}`,
            },
        });
    }
}
