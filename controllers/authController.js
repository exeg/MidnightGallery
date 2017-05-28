const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.chkVerify = async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    req.flash('error', 'No account with that email exists. Please repeat your registration.');
    return res.redirect('/signup');
  }
  if (user.verified) {
    next();
  } else {
    req.flash('error', 'Oops you must confirm your email to do that!');
    res.redirect('/resend');
  }

};

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed Login!',
  successRedirect: '/images',
  successFlash: 'You are now logged in!'
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are now logged out! 👋');
  res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    next(); 
    return;
  }
  req.flash('error', 'Oops you must be logged in to do that!');
  res.redirect('/login');
};

exports.isVerified = (req, res, next) => {
  if (req.user.verified) {
    next();
    return;
  }
  req.flash('error', 'Oops you must confirm your email to do that!');
  res.redirect('/resend');
};

exports.sendVerifyEmail = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    req.flash('error', 'No account with that email exists. Please repeat your registration.');
    return res.redirect('/signup');
  }
  user.verifyEmailToken = crypto.randomBytes(20).toString('hex');
  user.verifyEmailExpires = Date.now() + 3600000; // 1 hour from now
  await user.save();
  const confirmURL = `http://${req.headers.host}/account/verify/${user.verifyEmailToken}`;
  await mail.send({
    user,
    filename: 'verify-email',
    subject: 'Confirm your email',
    confirmURL
  });
  req.flash('success', `You have been emailed a confirmation link.`);
  res.redirect('/login');
};

exports.verifyEmail = async (req, res) => {
  const user = await User.findOne({
    verifyEmailToken: req.params.token,
    verifyEmailExpires: { $gt: Date.now() }
  });
  if (!user) {
    req.flash('error', 'Your email verification is invalid or has expired');
    return res.redirect('/login');
  }
  
  user.verified = true;
  await user.save();
  req.flash('success', '💃 Nice! Your are verified now! Please Login.');
  res.redirect('/login');
};

exports.forgot = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    req.flash('error', 'No account with that email exists.');
    return res.redirect('/login');
  }
  user.passwordResetToken = crypto.randomBytes(20).toString('hex');
  user.passwordResetExpires = Date.now() + 3600000; // 1 hour from now
  await user.save();
  const resetURL = `http://${req.headers.host}/account/reset/${user.passwordResetToken}`;
  await mail.send({
    user,
    filename: 'password-reset',
    subject: 'Password Reset',
    resetURL
  });
  req.flash('success', "You have been emailed a password reset link.");
  res.redirect('/login');
};

exports.reset = async (req, res) => {
  const user = await User.findOne({
    passwordResetToken: req.params.token,
    passwordResetExpires: { $gt: Date.now() }
  });
  if (!user) {
    req.flash('error', 'Password reset is invalid or has expired');
    return res.redirect('/login');
  }
  res.render('user/reset', { title: 'Reset your Password' });
};

exports.confirmedPasswords = (req, res, next) => {
  if (req.body.password === req.body['password-confirm']) {
    next();
    return;
  }
  req.flash('error', 'Passwords do not match!');
  res.redirect('back');
};

exports.update = async (req, res) => {
  const user = await User.findOne({
    passwordResetToken: req.params.token,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    req.flash('error', 'Password reset is invalid or has expired');
    return res.redirect('/login');
  }

  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  const updatedUser = await user.save();
  await req.login(updatedUser);
  req.flash('success', '💃 Nice! Your password has been reset! You are now logged in!');
  res.redirect('/');
};
