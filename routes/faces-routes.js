const express = require('express');
const { check } = require('express-validator');

const facesControllers = require('../controllers/faces-controllers');
const {fileUpload, upload} = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

router.get('/:pid', facesControllers.getFaceById);

router.get('/user/:uid', facesControllers.getFacesByUserId);

router.use(checkAuth);

router.post(
  '/',
  upload.single('image'),
  [
    check('title')
      .not()
      .isEmpty(),
    check('description').isLength({ min: 5 })
  ],
  facesControllers.createFace,
);

router.patch(
  '/:pid',
  [
    check('title')
      .not()
      .isEmpty(),
    check('description').isLength({ min: 5 })
  ],
  facesControllers.updateFace
);

router.delete('/:pid', facesControllers.deleteFace);

module.exports = router;
