const multer = require('multer');
const uuid = require('uuid/v1');

require("dotenv").config();
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
aws.config.update({
  secretAccessKey: process.env['ACCESS_SECRET'],
  accessKeyId: process.env['ACCESS_KEY'],
  region: process.env['REGION'],

});
const BUCKET = process.env['BUCKET']
const s3 = new aws.S3();


const MIME_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg'
};

const upload = multer({
  limits: 500000,
  storage: multerS3({
      s3: s3,
      bucket: BUCKET,
      key: function (req, file, cb) {
          // console.log(file);
          const ext = MIME_TYPE_MAP[file.mimetype];
          cb(null, uuid() + '.' + ext);
      }
  }),
  fileFilter: (req, file, cb) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid ? null : new Error('Invalid mime type!');
    cb(error, isValid);
  }
})


const fileUpload = multer({
  limits: 500000,
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/images');
    },
    filename: (req, file, cb) => {
      const ext = MIME_TYPE_MAP[file.mimetype];
      cb(null, uuid() + '.' + ext);
    }
  }),
  fileFilter: (req, file, cb) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid ? null : new Error('Invalid mime type!');
    cb(error, isValid);
  }
});

exports.fileUpload = fileUpload;
exports.upload = upload;