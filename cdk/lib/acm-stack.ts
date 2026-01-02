import * as cdk from "aws-cdk-lib";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import type { Construct } from "constructs";

interface TextReaderAcmStackProps extends cdk.StackProps {
  hostedZoneId: string;
  hostedZoneName: string;
  subdomain: string;
}

const createCertificate = (
  scope: Construct,
  id: string,
  domainName: string,
  hostedZone: route53.IHostedZone,
): certificatemanager.Certificate =>
  new certificatemanager.Certificate(scope, id, {
    domainName,
    validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
  });

export class TextReaderCloudFrontAcmStack extends cdk.Stack {
  readonly certificateArn: string;
  readonly domainName: string;

  constructor(scope: Construct, id: string, props: TextReaderAcmStackProps) {
    super(scope, id, props);

    const { hostedZoneId, hostedZoneName, subdomain } = props;
    const domainName = `${subdomain}.${hostedZoneName}`;

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
      hostedZoneId,
      zoneName: hostedZoneName,
    });

    const certificate = createCertificate(this, "CloudFrontCert", domainName, hostedZone);

    this.certificateArn = certificate.certificateArn;
    this.domainName = domainName;

    new cdk.CfnOutput(this, "CloudFrontCertificateArn", {
      value: this.certificateArn,
    });
    new cdk.CfnOutput(this, "CloudFrontCustomDomainName", {
      value: this.domainName,
    });
  }
}

export class TextReaderCognitoAcmStack extends cdk.Stack {
  readonly certificateArn: string;
  readonly domainName: string;

  constructor(scope: Construct, id: string, props: TextReaderAcmStackProps) {
    super(scope, id, props);

    const { hostedZoneId, hostedZoneName, subdomain } = props;
    const domainName = `${subdomain}.${hostedZoneName}`;

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
      hostedZoneId,
      zoneName: hostedZoneName,
    });

    const certificate = createCertificate(this, "CognitoCert", domainName, hostedZone);

    this.certificateArn = certificate.certificateArn;
    this.domainName = domainName;

    new cdk.CfnOutput(this, "CognitoCertificateArn", {
      value: this.certificateArn,
    });
    new cdk.CfnOutput(this, "CognitoCustomDomainName", {
      value: this.domainName,
    });
  }
}
