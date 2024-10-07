import multer from 'multer';
import { s3Storage } from '../client/s3';

export const updateProfileMiddleware = multer({ storage: s3Storage });
