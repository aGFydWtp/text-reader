import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ssm from "aws-cdk-lib/aws-ssm";
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
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole",
        ),
      ],
      description:
        "Execution role for Lambda@Edge function with CloudWatch logs access",
    });

    // Lambda@Edge function for request/response manipulation
    this.lambdaEdgeFunction = new lambda.Function(
      this,
      "EdgeFunction",
      {
        runtime: lambda.Runtime.NODEJS_24_X,
        handler: "content-hash-calculator.handler",
        role: lambdaEdgeRole,
        code: lambda.Code.fromAsset(path.join(__dirname, "..", "lambdas")),
        description:
          "Lambda@Edge function for CloudFront distribution",
        timeout: cdk.Duration.seconds(5), // Lambda@Edge has 5-second timeout limit
        memorySize: 128, // Minimal memory for edge functions
        architecture: lambda.Architecture.X86_64, // Lambda@Edge requires x86_64
      },
    );

    // Create SSM parameters in us-east-1 for cross-region reference
    new ssm.StringParameter(this, "LambdaEdgeVersionParam", {
      parameterName: "/text-reader/lambda-edge/version-arn",
      stringValue: this.lambdaEdgeFunction.currentVersion.functionArn,
      description: "Lambda@Edge versioned function ARN for CloudFront",
      tier: ssm.ParameterTier.STANDARD,
    });
  }
}
