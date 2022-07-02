const fs = require('fs');

const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const imageToBase64 = require('image-to-base64');
var FormData = require('form-data');

const HttpError = require('../models/http-error');
const Face = require('../models/face');
const User = require('../models/user');

const getFaceById = async (req, res, next) => {
  const faceId = req.params.pid;

  let face;
  try {
    face = await Face.findById(faceId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not find a face.',
      500
    );
    return next(error);
  }

  if (!face) {
    const error = new HttpError(
      'Could not find face for the provided id.',
      404
    );
    return next(error);
  }

  res.json({ face: face.toObject({ getters: true }) });
};

const getFacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let faces;
  let userWithFaces;
  try {
    userWithFaces = await User.findById(userId).populate('faces');
  } catch (err) {
    const error = new HttpError(
      'Fetching faces failed, please try again later.',
      500
    );
    return next(error);
  }

  // if (!faces || faces.length === 0) {
  if (!userWithFaces || userWithFaces.faces.length === 0) {
    return next(
      new HttpError('Could not find faces for the provided user id.', 404)
    );
  }

  res.json({
    faces: userWithFaces.faces.map(face =>
      face.toObject({ getters: true })
    )
  });
};

const createFace = async (req, res, next) => {
  const errors = validationResult(req.body);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { title, description } = req.body;


  const createdFace = new Face({
    title,
    description,
    image: req.file.path,
    creator: req.userData.userId
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError(
      'Creating face failed, please try again.',
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError('Could not find user for provided id.', 404);
    return next(error);
  }

  console.log(user);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdFace.save({ session: sess });
    user.faces.push(createdFace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Creating face failed, please try again 2.',
      500
    );
    return next(error);
  }

  res.status(201).json({ face: createdFace });
};

const updateFace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { title, description } = req.body;
  const faceId = req.params.fid;

  let face;
  try {
    face = await Face.findById(faceId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update face.',
      500
    );
    return next(error);
  }

  if (face.creator.toString() !== req.userData.userId) {
    const error = new HttpError('You are not allowed to edit this face.', 401);
    return next(error);
  }

  face.title = title;
  face.description = description;

  try {
    await face.save();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update face.',
      500
    );
    return next(error);
  }

  res.status(200).json({ face: face.toObject({ getters: true }) });
};

const deleteFace = async (req, res, next) => {
  const faceId = req.params.pid;

  let face;
  try {
    face = await Face.findById(faceId).populate('creator');
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete face.',
      500
    );
    return next(error);
  }

  if (!face) {
    const error = new HttpError('Could not find face for this id.', 404);
    return next(error);
  }

  if (face.creator.id !== req.userData.userId) {
    const error = new HttpError(
      'You are not allowed to delete this face.',
      401
    );
    return next(error);
  }

  const imagePath = face.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await face.remove({ session: sess });
    face.creator.faces.pull(face);
    await face.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete face.',
      500
    );
    return next(error);
  }

  fs.unlink(imagePath, err => {
    console.log(err);
  });

  res.status(200).json({ message: 'Deleted face.' });
};

exports.getFaceById = getFaceById;
exports.getFacesByUserId = getFacesByUserId;
exports.createFace = createFace;
exports.updateFace = updateFace;
exports.deleteFace = deleteFace;