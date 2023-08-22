import { GithubActionsIdentityProvider, GithubActionsRole } from "aws-cdk-github-oidc";
import * as cdk from "aws-cdk-lib";
import { CfnOutput } from "aws-cdk-lib";
import { ManagedPolicy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import * as statement from "cdk-iam-floyd";
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
                    new statement.Sts().allow().toAssumeRole().on(`arn:aws:iam::${this.account}:role/cdk-*`),
                    new statement.Iam()
                        .allow()
                        .toGetRole()
                        .toCreateRole()
                        .toAttachRolePolicy()
                        .toGetRolePolicy()
                        .toPutRolePolicy()
                        .toDetachRolePolicy(),
                    new statement.Cloudformation()
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
                    new statement.Ssm().allow().toGetParameter().toGetParameters().toPutParameter(),
                    new statement.S3()
                        .allow()
                        .toCreateBucket()
                        .toPutEncryptionConfiguration()
                        .toPutLifecycleConfiguration()
                        .toPutBucketVersioning()
                        .toPutBucketPublicAccessBlock()
                        .toGetBucketPolicy()
                        .toPutBucketPolicy()
                        .onBucket("arn:aws:s3:::cdk*"),
                    new statement.Ecr()
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
            new statement.Iam()
                .allow()
                .allMatchingActions("/.*Role.*/i")
                .allMatchingActions("/.*PolicyVersion.*/i")
                .toGetPolicy()
                .toCreatePolicy()
                .toDeletePolicy()
                .notResource()
                .on("arn:aws:iam::*:role/cdk-*"),
            new statement.Cloudwatch().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new statement.Lambda().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new statement.Logs().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new statement.S3().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new statement.Sqs().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new statement.Events().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new statement.Ssm().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new statement.Secretsmanager().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new statement.Acm().allow().allActions(),
            new statement.Route53().allow().allActions(),
            new statement.Cloudfront().allow().allActions(),
        ];

        switch (props.account) {
            case Account.SHARED_SERVICES:
                return [...basePolicies, new statement.Ses().allow().allActions()];
            case Account.REF_DATA:
                return [
                    ...basePolicies,
                    new statement.ApigatewayV2().allow().allActions().ifAwsRequestedRegion(allowedRegions),
                    new statement.Rds().allow().allActions().ifAwsRequestedRegion(allowedRegions),
                    new statement.Ec2().allow().allActions().ifAwsRequestedRegion(allowedRegions),
                    new statement.Ses().allow().allActions(),
                    new statement.Ec2()
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
                    new statement.Iam()
                        .allow()
                        .toCreateUser()
                        .toGetUser()
                        .toGetUserPolicy()
                        .toCreateAccessKey()
                        .toAttachUserPolicy()
                        .toDetachUserPolicy(),
                    new statement.Dynamodb().allow().allActions(),
                    new statement.Apigateway().allow().allActions(),
                    new statement.Ses().allow().allActions(),
                    new statement.CognitoIdp().allow().allActions(),
                ];
            default:
                return basePolicies;
        }
    }
}
