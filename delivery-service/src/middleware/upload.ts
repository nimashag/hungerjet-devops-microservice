import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { logInfo } from '../utils/logger';

// Absolute path to the 'uploads' folder
const uploadDir = path.join(__dirname, '../../uploads');

// Create uploads folder if not exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        logInfo('upload.destination', { uploadDir });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = uniqueSuffix + path.extname(file.originalname);
        logInfo('upload.filename.generated', { fileName });
        cb(null, fileName);
    }
});

// Export multer instance
export const upload = multer({ storage /*, fileFilter */ });
