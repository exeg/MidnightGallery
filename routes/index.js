const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { catchErrors } = require('../handlers/errorHandlers');

router.get('/', catchErrors(userController.main));
router.get('/homereg', authController.isLoggedIn, catchErrors(userController.home));

router.get('/images', authController.isLoggedIn, catchErrors(imageController.getImages));
router.get('/images-album/:id', authController.isLoggedIn, catchErrors(imageController.getImagesAlbum));

router.get('/sytem-album/:id', authController.isLoggedIn, catchErrors(imageController.getImagesAlbum));
router.get('/sytem-images', authController.isLoggedIn, catchErrors(imageController.getImages));

router.post('/images-album/create/:id', authController.isLoggedIn, imageController.createAlbum);
router.post('/images-album/create/', authController.isLoggedIn, imageController.createFirstAlbum);
router.post('/images-album/delete/:id', authController.isLoggedIn, imageController.removeAlbum);
router.post('/images-album/rename/:id', catchErrors(imageController.renameAlbum));

router.get('/images/search/:id', authController.isLoggedIn, catchErrors(imageController.searchImages));

router.post('/images-album/upload/:id', authController.isLoggedIn, imageController.upload, imageController.resize);
router.post('/images/delete/:album/:id', authController.isLoggedIn, catchErrors(imageController.deleteImage));
router.post('/images/rename/:id', authController.isLoggedIn, catchErrors(imageController.renameImage));

router.get('/login', userController.loginForm);
router.post('/login', authController.chkVerify, authController.login);
router.get('/signup', userController.registerForm);


router.post('/signup',
  userController.validateRegister,
  userController.verifyRecaptcha,
  userController.register,
  authController.sendVerifyEmail
);

router.get('/logout', authController.logout);
router.get('/forgot', userController.forgot);
router.post('/forgot', catchErrors(authController.forgot));

router.get('/account/verify/:token', catchErrors(authController.verifyEmail));

router.get('/resend', userController.reverify);
router.post('/resend', authController.sendVerifyEmail);


router.get('/account/reset/:token', catchErrors(authController.reset));
router.post('/account/reset/:token',
  authController.confirmedPasswords,
  catchErrors(authController.update)
);


module.exports = router;
