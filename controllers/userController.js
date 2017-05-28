const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const request = require('request');
const path = require('path');
const mkdirp = require('mkdirp');

const capsecret = process.env.CAPSECRET;

exports.loginForm = (req, res) => {
  res.render('user/login', {title: 'Login || Midnight Gallery'});
};

exports.registerForm =  (req, res) => {
  res.render('user/signup', {title: 'Sign Up || Midnight Gallery'});
};

exports.validateRegister = (req, res, next) => {
  req.checkBody('fullname', 'Fullname is Required').notEmpty();
  req.checkBody('fullname', 'Fullname Must Not Be Less Than 5').isLength({min:5});
  req.checkBody('email', 'Email is Required').notEmpty();
  req.checkBody('email', 'Email is Invalid').isEmail();
  req.checkBody('password', 'Password is Required').notEmpty();
  req.checkBody('password', 'Password Must Not Be Less Than 5').isLength({min:5});
    
 const errors = req.validationErrors();
  if (errors) {
    req.flash('error', errors.map(err => err.msg));
    res.render('user/signup', { title: 'Sign Up || Midnight Gallery', flashes: req.flash() });
    return;
  }
  next();
};

exports.register = async (req, res, next) => {
  let homeDir = req.body.fullname.replace(/\s/g, '');
  mkdirp(res.locals.gpath +  homeDir, function (err) {
    if (err) {
      req.flash('error', 'Can`t create your user directory, please contact Admin');
      res.redirect('/signup');  
    };
  });
  const user = new User({ fullname: req.body.fullname, email: req.body.email, homeDir: homeDir});
  const register = promisify(User.register, User);
  await register(user, req.body.password);
  next();
};

exports.verifyRecaptcha = (req, res, next) => {
  let url = "https://www.google.com/recaptcha/api/siteverify?secret=" + capsecret + "&response=" + req.body['g-recaptcha-response'];
  request(url, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const CpResponse = JSON.parse(body);
      if (CpResponse.success) {
        return next();
    } else {
        req.flash('error', 'Captcha failed.');
        res.redirect('/signup');
    }
  } else {
      console.log("Got an error: ", error, ", status code: ", response.statusCode)
  }
})
};

exports.forgot = (req, res) => {
  res.render('user/forgot', {title: 'Request Password Reset'});
};

exports.reverify =  (req, res) => {
  res.render('user/verify', {title: 'Request Verification'});
};  

exports.main = async (req, res) => {
  if(req.session.cookie.originalMaxAge !== null){
    res.redirect('/images');
 }else{
    res.render('index', {title: 'Index || Midnight Gallery'});
 }
};

exports.home = async (req, res) => {
  res.render('homereg', {title: 'Home || Midnight Gallery'});
};