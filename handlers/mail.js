const nodemailer = require('nodemailer');
const ejs = require('ejs');
const htmlToText = require('html-to-text');
const promisify = require('es6-promisify');

const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

const generateHTML = async (filename, options = {}) => {
  const htmlRender = promisify(ejs.renderFile, ejs);
  let html = await htmlRender(`${__dirname}/../views/email/${filename}.ejs`, options);
  return html;   
};

exports.send = async (options) => {
  const html = await generateHTML(options.filename, options);
  const text = htmlToText.fromString(html);
  const mailOptions = {
    from: `Admin <noreply@gallery.com>`,
    to: options.user.email,
    subject: options.subject,
    html,
    text
  };
   const sendMail = promisify(transport.sendMail, transport);
   await sendMail(mailOptions);
   return; 
};
