import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import config from '../../config';

export const s3Client = new S3Client({
	region: 'us-east-1',
	credentials: {
		accessKeyId: config.s3accessKeyId,
		secretAccessKey: config.s3secretAccessKey,
	},
});

export const s3Storage = multerS3({
	s3: s3Client,
	bucket: `${process.env.S3_BUCKETNAME}`,
	metadata: (req, file, cb) => {
		cb(null, { fieldname: file.fieldname });
	},
	key: (req, file, cb) => {
		const fileName =
			Date.now() + '_' + file.fieldname + '_' + file.originalname;
		cb(null, fileName);
	},
});
