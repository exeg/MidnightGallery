const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
//const md5 = require('md5');
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');
//const bcrypt = require('bcrypt-nodejs');

const userSchema = new Schema({
  fullname: {
    type: String, 
    required: 'Please supply a name'
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Invalid Email Address'],
    required: 'Please Supply an email address'
  },
  homeDir: {
    type: String,
    required: true,
    trim: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifyEmailToken: {
    type: String
  },
  verifyEmailExpires: {
    type: Date
  },
  passwordResetToken: {
    type: String    
  },
  passwordResetExpires: {
    type: Date
  }
});

// userSchema.virtual('gravatar').get(function() {
//   const hash = md5(this.email);
//   return `https://gravatar.com/avatar/${hash}?s=200`;
// });

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
userSchema.plugin(mongodbErrorHandler);

module.exports = mongoose.model('User', userSchema);