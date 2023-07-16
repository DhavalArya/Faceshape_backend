const fs = require('fs');
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dotenv = require("dotenv");

const facesRoutes = require('./routes/faces-routes');
const usersRoutes = require('./routes/users-routes');
const HttpError = require('./models/http-error');

dotenv.config()

const aws = require('aws-sdk');
const { stat } = require('fs/promises');

aws.config.update({
  secretAccessKey: process.env['ACCESS_SECRET'],
  accessKeyId: process.env['ACCESS_KEY'],
  region: process.env['REGION'],

});
const BUCKET = process.env['BUCKET']
const s3 = new aws.S3();

const app = express();

app.use(bodyParser.json());

// app.use('/uploads/images', express.static(path.join('uploads', 'images')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');

  next();
});

// app.use(async (req, res, next) => {
//   let r = await s3.listObjectsV2({ Bucket: BUCKET }).promise();
//   let x = r.Contents.map(item => item.Key);
//   for(filename of x){
//     const exists = await stat(`./uploads/images/${filename}`)
//     .then(() => true)
//     .catch(() => false);
//     if(exists){
//       continue;
//     }
//     console.log(filename);
//     let s3image = await s3.getObject({ Bucket: BUCKET, Key: filename }).promise();
//     await fs.writeFile(`./uploads/images/${filename}`, s3image.Body, function(err, result) {
//       if(err) console.log('error', err);
//     });
//   }
//   next();
// })

app.get("/uploads/images/:filename", async (req, res) => {
  const filename = req.params.filename
  let x = await s3.getObject({ Bucket: BUCKET, Key: filename }).promise();
  res.send(x.Body)
})


app.use('/api/faces', facesRoutes);
app.use('/api/users', usersRoutes);

app.use((req, res, next) => {
  const error = new HttpError('Could not find this route.', 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, err => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || 'An unknown error occurred!' });
});

mongoose
  .connect(
    `mongodb+srv://${process.env['DB_USERNAME']}:${process.env['DB_PASSWORD']}@cluster0.bpdo4.mongodb.net/${process.env['DB_NAME']}?retryWrites=true&w=majority`, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true}
  )
  .then(() => {
    app.listen(process.env['PORT'] || 5000);
  })
  .catch(err => {
    console.log(err);
  });
