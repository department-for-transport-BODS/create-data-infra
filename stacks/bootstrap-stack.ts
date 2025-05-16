import { GithubActionsIdentityProvider, GithubActionsRole } from "aws-cdk-github-oidc";
import * as cdk from "aws-cdk-lib";
import { CfnOutput } from "aws-cdk-lib";
import { ManagedPolicy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Statement } from "cdk-iam-floyd";
import { Construct } from "constructs";
import { Account, CDStackProps } from "../bin/create-data-infra";

export class BootstrapStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: CDStackProps) {
        super(scope, id, props);

        if (props.env.region === "eu-west-2") {
            const ORG_NAME = "Department-for-Transport-Disruptions";

            const provider = new GithubActionsIdentityProvider(this, "cd-infra-github-actions-provider");

            const githubActionsPolicy = new ManagedPolicy(this, "cd-infra-github-actions-policy", {
                statements: [
                    new Statement.Sts().allow().toAssumeRole().on(`arn:aws:iam::${this.account}:role/cdk-*`),
                    new Statement.Iam()
                        .allow()
                        .toGetRole()
                        .toCreateRole()
                        .toAttachRolePolicy()
                        .toGetRolePolicy()
                        .toPutRolePolicy()
                        .toDetachRolePolicy(),
                    new Statement.Cloudformation()
                        .allow()
                        .toDescribeStacks()
                        .toDescribeStackEvents()
                        .toDescribeStackResources()
                        .toDescribeChangeSet()
                        .toCreateChangeSet()
                        .toDeleteChangeSet()
                        .toExecuteChangeSet()
                        .toGetTemplate()
                        .toListImports()
                        .toListExports(),
                    new Statement.Ssm().allow().toGetParameter().toGetParameters().toPutParameter(),
                    new Statement.S3()
                        .allow()
                        .toCreateBucket()
                        .toPutEncryptionConfiguration()
                        .toPutLifecycleConfiguration()
                        .toPutBucketVersioning()
                        .toPutBucketPublicAccessBlock()
                        .toGetBucketPolicy()
                        .toPutBucketPolicy()
                        .onBucket("arn:aws:s3:::cdk*"),
                    new Statement.Ecr()
                        .allow()
                        .toCreateRepository()
                        .toSetRepositoryPolicy()
                        .toDescribeRepositories()
                        .toListTagsForResource()
                        .toGetLifecyclePolicy()
                        .toGetRepositoryPolicy(),
                ],
            });

            new GithubActionsRole(this, "cd-infra-github-actions-upload-role", {
                provider: provider,
                owner: ORG_NAME,
                repo: "create-data-infra",
                filter: `environment:${props.account}`,
                description: "Role for Github Actions runner to assume for CD Infra deployments",
                roleName: `cd-infra-github-actions-role-${props.env.region}`,
                managedPolicies: [githubActionsPolicy],
            });

            if (props.account === Account.REF_DATA && props.stage) {
                new GithubActionsRole(this, "ref-data-service-github-actions-role", {
                    provider: provider,
                    owner: ORG_NAME,
                    repo: "reference-data-service",
                    filter: `environment:${props.account}_${props.stage}`,
                    description: "Role for Github Actions runner to assume for Ref Data Service deployments",
                    roleName: `ref-data-service-github-actions-role-${props.env.region}`,
                    managedPolicies: [githubActionsPolicy],
                });
            }

            if (props.account === Account.DISRUPTIONS && props.stage) {
                new GithubActionsRole(this, "cdd-github-actions-role", {
                    provider: provider,
                    owner: ORG_NAME,
                    repo: "create-disruptions-data",
                    filter: `environment:${props.account}_${props.stage}`,
                    description: "Role for Github Actions runner to assume for Create Disruptions deployments",
                    roleName: `cdd-github-actions-role-${props.env.region}`,
                    managedPolicies: [githubActionsPolicy],
                });
            }
        }

        const cdkExecutionPolicy = new ManagedPolicy(this, "cd-infra-cdk-execution-policy", {
            managedPolicyName: `cd-infra-cdk-execution-policy-${props.env.region}`,
            statements: this.createCdkPolicyStatements(props),
        });

        new CfnOutput(this, "cd-infra-cdk-execution-policy-arn", {
            value: cdkExecutionPolicy.managedPolicyArn,
        });
    }

    private createCdkPolicyStatements(props: CDStackProps): PolicyStatement[] {
        const allowedRegions = ["eu-west-2", "us-east-1"];

        const basePolicies = [
            new Statement.Iam()
                .allow()
                .allMatchingActions("/.*Role.*/i")
                .allMatchingActions("/.*PolicyVersion.*/i")
                .toGetPolicy()
                .toCreatePolicy()
                .toDeletePolicy()
                .notResource()
                .on("arn:aws:iam::*:role/cdk-*"),
            new Statement.Cloudwatch().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new Statement.Lambda().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new Statement.Logs().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new Statement.S3().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new Statement.Sqs().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new Statement.Events().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new Statement.Ssm().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new Statement.Secretsmanager().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new Statement.Sns().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new Statement.Acm().allow().allActions(),
            new Statement.Route53().allow().allActions(),
            new Statement.Cloudfront().allow().allActions(),
        ];

        switch (props.account) {
            case Account.SHARED_SERVICES:
                return [...basePolicies, new Statement.Ses().allow().allActions()];
            case Account.REF_DATA:
                return [
                    ...basePolicies,
                    new Statement.ApigatewayV2().allow().allActions().ifAwsRequestedRegion(allowedRegions),
                    new Statement.Rds().allow().allActions().ifAwsRequestedRegion(allowedRegions),
                    new Statement.Ec2().allow().allActions().ifAwsRequestedRegion(allowedRegions),
                    new Statement.Ses().allow().allActions(),
                    new Statement.Ec2()
                        .deny()
                        .toRunInstances()
                        .toRunScheduledInstances()
                        .toCreateLaunchTemplate()
                        .toCreateKeyPair()
                        .toCreateTransitGateway()
                        .toCreateVpnGateway()
                        .toCreateVpnConnection(),
                ];
            case Account.DISRUPTIONS:
                return [
                    ...basePolicies,
                    new Statement.Iam()
                        .allow()
                        .toCreateUser()
                        .toGetUser()
                        .toGetUserPolicy()
                        .toCreateAccessKey()
                        .toAttachUserPolicy()
                        .toDetachUserPolicy()
                        .toCreateInstanceProfile()
                        .toDeleteInstanceProfile()
                        .toGetInstanceProfile()
                        .toAddRoleToInstanceProfile()
                        .toListInstanceProfiles(),
                    new Statement.Dynamodb().allow().allActions(),
                    new Statement.Apigateway().allow().allActions(),
                    new Statement.Ses().allow().allActions(),
                    new Statement.CognitoIdp().allow().allActions(),
                    new Statement.Backup().allow().allActions().ifAwsRequestedRegion(allowedRegions),
                    new Statement.BackupStorage().allow().allActions().ifAwsRequestedRegion(allowedRegions),
                    new Statement.Kms().allow().allActions().ifAwsRequestedRegion(allowedRegions),
                    new Statement.Ec2().allow().allActions().ifAwsRequestedRegion(allowedRegions),
                    new Statement.Rds().allow().allActions().ifAwsRequestedRegion(allowedRegions),
                    new Statement.States().allow().allActions().ifAwsRequestedRegion(allowedRegions),
                    new Statement.Scheduler().allow().allActions().ifAwsRequestedRegion(allowedRegions),
                ];
            default:
                return basePolicies;
        }
    }
}
