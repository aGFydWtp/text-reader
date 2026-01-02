import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import type { Construct } from "constructs";

export interface LambdaEdgeStackProps extends cdk.StackProps {}

export class LambdaEdgeStack extends cdk.Stack {
  public readonly lambdaEdgeFunction: lambda.Function;

  constructor(scope: Construct, id: string, props?: LambdaEdgeStackProps) {
    super(scope, id, props);

    // Lambda@Edge execution role with minimal required permissions
    const lambdaEdgeRole = new iam.Role(this, "LambdaEdgeRole", {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("lambda.amazonaws.com"),
        new iam.ServicePrincipal("edgelambda.amazonaws.com"),
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
      ],
      description: "Execution role for Lambda@Edge function with CloudWatch logs access",
    });

    // Lambda@Edge function for request/response manipulation
    this.lambdaEdgeFunction = new NodejsFunction(this, "EdgeFunction", {
      runtime: lambda.Runtime.NODEJS_24_X,
      timeout: cdk.Duration.seconds(5), // Lambda@Edge has 5-second timeout limit
      entry: path.join(__dirname, "..", "lambdas", "content-hash-calculator.ts"),
      handler: "handler",
      role: lambdaEdgeRole,
      description: "Lambda@Edge function for CloudFront distribution",
      memorySize: 128, // Minimal memory for edge functions
    });

    new cdk.CfnOutput(this, "LambdaEdgeCurrentVersionArn", {
      value: this.lambdaEdgeFunction.currentVersion.functionArn,
    });
  }
}
