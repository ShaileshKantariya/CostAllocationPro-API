import config from '../../config';

export const awsConfig = {
	region: 'us-east-1' as string,
	credentials: {
		accessKeyId: config.s3accessKeyId as string,
		secretAccessKey: config.s3secretAccessKey as string,
	},
};
