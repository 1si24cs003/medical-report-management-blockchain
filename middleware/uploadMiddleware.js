const multer = require('multer');

// Memory storage keeps file buffer in memory for instant hashing and encryption
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25 MB max
    },
    fileFilter: (req, file, cb) => {
        // Accept PDF, images, text diagnostic reports
        const allowedMime = [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/webp',
            'text/plain'
        ];
        if (allowedMime.includes(file.mimetype) || file.originalname.match(/\.(pdf|png|jpe?g|webp|txt)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type. Only PDF, PNG, JPG, and TXT medical reports are allowed.'));
        }
    }
});

module.exports = upload;
