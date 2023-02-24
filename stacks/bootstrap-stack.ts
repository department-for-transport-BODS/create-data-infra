import { GithubActionsIdentityProvider, GithubActionsRole } from "aws-cdk-github-oidc";
import * as cdk from "aws-cdk-lib";
import { CfnOutput } from "aws-cdk-lib";
import { ManagedPolicy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import * as statement from "cdk-iam-floyd";
import { Construct } from "constructs";
import { CDStackProps } from "../bin/create-data-infra";

export class BootstrapStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: CDStackProps) {
        super(scope, id, props);

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
                    .toDescribeChangeSet()
                    .toCreateChangeSet()
                    .toDeleteChangeSet()
                    .toExecuteChangeSet()
                    .toGetTemplate(),
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

        const cdkExecutionPolicy = new ManagedPolicy(this, "cd-infra-cdk-execution-policy", {
            managedPolicyName: `cd-infra-cdk-execution-policy-${props.env.region}`,
            statements: this.createCdkPolicyStatements(props),
        });

        new CfnOutput(this, "cd-infra-cdk-execution-policy-arn", {
            value: cdkExecutionPolicy.managedPolicyArn,
        });
    }

    private createCdkPolicyStatements(props: CDStackProps): PolicyStatement[] {
        const allowedRegions = ["eu-west-2"];

        const basePolicies = [
            new statement.Iam()
                .allow()
                .allMatchingActions("/.*Role.*/i")
                .allMatchingActions("/.*PolicyVersion.*/i")
                .toCreatePolicy()
                .toDeletePolicy()
                .notResource()
                .on("arn:aws:iam::*:role/cdk-*"),
            new statement.Cloudwatch()
                .allow()
                .allActions()
                .ifAwsRequestedRegion([])
                .ifAwsRequestedRegion(allowedRegions),
            new statement.Lambda().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new statement.Logs().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new statement.S3().allow().allActions().ifAwsRequestedRegion(allowedRegions),
            new statement.Ssm().allow().toGetParameter().toGetParameters().toPutParameter(),
        ];

        switch (props.account) {
            default:
                return basePolicies;
        }
    }
}
