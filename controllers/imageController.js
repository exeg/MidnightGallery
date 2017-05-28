const path = require('path');
const fs = require('fs');
const User = require('../models/user');
const dirTree = require('directory-tree');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const multer = require('multer');
const sizeOf = require('image-size');
const promisify = require('es6-promisify');
const jimp = require('jimp');
const find = require('find');
const url = require('url');
const crypto = require('crypto');

const upload = multer({ 
  limits: { fieldNameSize: 100, fileSize: 3145728 },
  fileFilter(req, file, cb) {
    let isPhoto = file.mimetype.startsWith('image/');
    if(isPhoto) {
      cb(null, true);
    } else {
      cb(new Error('That filetype isn\'t allowed!'));
    }
   },
  storage: multer.memoryStorage()
}).array('photo',12);


function getImagesFromDir(dirPath, userpath, allImages) {
  let files = fs.readdirSync(dirPath);
  for (file of files) {
    let fileLocation = path.join(dirPath, file);
    let stat = fs.statSync(fileLocation);
    if (stat && stat.isFile() && ['.jpg', '.png'].indexOf(path.extname(fileLocation)) != -1) {
      let dimensions = sizeOf('public/gallery/'+ userpath + '/' + file);
      let imageObj = {
        path : '/gallery/'+ userpath + '/' + file,
        name : file.toString(),
        height : dimensions.height,
        width : dimensions.width,
        created : stat.atime
      };
      allImages.push(imageObj);
    }
  } 
  return allImages;
};


function DirsFromTree (tree, allDirs, search=false) {
  for (child in tree.children) {
    if (tree.children[child].type ==='directory'){
      allDirs.push(tree.children[child]);
    }
  }
  return allDirs;
};


exports.getImages = async (req, res) => {
  let newpath = path.join(res.locals.gpath, req.user.homeDir);
  let usrHome = req.user.homeDir;
  let qstring  = '';
  if (req.query.system === 'true' ) {
    usrHome = 'system';
    qstring  = '?sytem=true';
  }
  let menuItems = new Promise( (resolve, reject) => {
    let tree = dirTree(path.join(res.locals.gpath, usrHome + '/'));
    let allDirs = [];
    allDirs = DirsFromTree(tree, allDirs);
    if (allDirs[0]) {
      resolve(allDirs);
      } else {
      let error = "No Directories";
      reject(error);
      }
  });

menuItems
.then(function (result) {
       res.redirect(url.format({
       pathname:'/images-album/'+result[0].path.replace(/\\/g," "),
       query:req.query,
 }));
      }, function(error) {
      res.redirect('/homereg');
      //console.log('No directories!!'); 
      });
};

exports.deleteImage = async (req, res) => {   
  let newpath = req.params.album.replace(/\s/g, '\\');
  let astr = path.join(res.locals.gpath, req.user.homeDir + '/' + newpath);
  fs.unlink(astr + '/' + req.params.id, (err) => {
    if (err) throw err;
    req.flash('success', 'Image deleted.');
    res.redirect('/images-album/' + astr);
    });
};

exports.getImagesAlbum = async (req, res) => { 
  let systemf  = false;
  let usrHome = req.user.homeDir;
  let ptitle = 'User'
   if (req.query.system === 'true' ) {
    usrHome = 'system';
    systemf  = true;
    ptitle = 'System';
  }
  let newpath = req.params.id.replace(/\s/g, '\\');
  let astr = path.join(res.locals.gpath, usrHome + '/');
  if (!newpath.includes(astr)) {
    newpath = astr  + newpath;
  }
  let bstr = newpath.replace(astr,'');
  let album = bstr.replace(/\\/g," ");
  let sortorder = (req.query.sort || 'name');  

  let menuItemsPromise = new Promise( (resolve, reject) => {
    let tree = dirTree(path.join(res.locals.gpath, usrHome + '/'));
    let allDirs = [];
    allDirs = DirsFromTree(tree, allDirs);
    if (allDirs[0]) {
      resolve(allDirs);
      } else {
      let error = "No Directories";
      reject(error);
      }
  });

  let imagesPromise = new Promise( (resolve, reject) => {
    let allImages = [];
    hdr = usrHome + '/'+ bstr;
    resolve(getImagesFromDir(newpath,hdr,allImages));
  });

  const [items, images] = await Promise.all([menuItemsPromise, imagesPromise]);

  if (sortorder === 'created') {
    images.sort(function(a,b){
    return new Date(b.created) - new Date(a.created);
    });
    } else { 
    images.sort(function(a,b) {
    return a.name - b.name;
    });
  }
  //set default variables
  let totalImages = images.length,
  pageSize = 6,
  currentPage = 1,
  ImagesArrays = [], 
  ImagesPage = [];
  
  while (images.length > 0) {
    ImagesArrays.push(images.splice(0, pageSize));
  }
  pageCount = ImagesArrays.length;
  
  if (typeof req.query.page !== 'undefined') {
    currentPage = +req.query.page;
  }
  ImagesPage = ImagesArrays[+currentPage - 1];
  res.render('gallery/images1', 
  { title: 'Node js',
    user:req.user, 
    images: ImagesPage,
    pageSize: pageSize,
    pageCount: pageCount,
    currentPage: currentPage,
    items: items, 
    album: album,
    search: false,
    systemf: systemf,
    sortorder: sortorder,
    ptitle: ptitle 
  });
};

exports.createFirstAlbum = async (req, res) => {
   let astr = path.join(res.locals.gpath, req.user.homeDir + '/' + req.body.album);
  mkdirp(astr, function (err) {
    if (err) {
      console.error(err);
      req.flash('Error', 'Can`t create new Album.');
      res.redirect('/homereg');
    } else {
      req.flash('success', 'New Album created.');
      res.redirect('/images-album/' + astr);
    }
  });
};

exports.createAlbum = async (req, res) => {
  let newpath = req.params.id.replace(/\s/g, '\\');
  let astr = path.join(res.locals.gpath, req.user.homeDir + '/' + newpath + '/' + req.body.album);
  mkdirp(astr, function (err) {
    if (err) {
      console.error(err);
      req.flash('Error', 'Can`t create new Album.');
      res.redirect('/images-album/' + path.join(res.locals.gpath, req.user.homeDir + '/' + newpath));
    } else {
      req.flash('success', 'New Album created.');
      res.redirect('/images-album/' + astr);
    }
  });
};

exports.removeAlbum = async (req, res) => {
  let newpath = req.params.id.replace(/\s/g, '\\');
  let astr = path.join(res.locals.gpath, req.user.homeDir + '/' + newpath);

  rimraf(astr, function (err) {
    if (err) {
      console.error(err);
      req.flash('Error', 'Can`t delete Album.');
      res.redirect('/images-album/' + path.join(res.locals.gpath, req.user.homeDir + '/' + newpath));
    } else {
      req.flash('success', 'Album deleted.');
      res.redirect('/images');
    }
  });
};

exports.upload = async (req, res) => {
  let newpath = req.params.id.replace(/\s/g, '\\');
  let astr = path.join(res.locals.gpath, req.user.homeDir + '/' + newpath);

  upload(req, res, function (err) {
    if (err) {
      console.log(err);
      req.flash('Error', 'Can`t upload Images.');
      res.redirect('/images-album/' + path.join(res.locals.gpath, req.user.homeDir + '/' + newpath));
      return;
  }
  
   for (let i=0; i < req.files.length; i++ ){
     let filename = req.files[i].originalname;
     let exist = fs.existsSync(astr + '/' + filename);
     if (exist) {
       let extension = filename.split('.')[1];
       filename = filename.substring(0, extension.length);
       filename = filename + crypto.randomBytes(10).toString('hex') + '.' + extension;
     }
     jimp.read(req.files[i].buffer).then( function (photo) {
     photo.resize(600, jimp.AUTO);
     photo.write(astr + '/' + filename);
     }).catch(function (err) {
        console.error(err);
     });

   }    
    req.flash('success', 'Your images uploded successfully.');
    res.redirect('/images-album/' + path.join(res.locals.gpath, req.user.homeDir + '/' + newpath) + '?' + 'sort=created');
   
  })

};


exports.searchImages = async (req, res, next) => {
  let sortorder = (req.query.sort || 'name');
  let usrHome = req.user.homeDir;  
  let systemf = false;
  let squery = '';
  if (req.params.id === 'true' ) {
    usrHome = 'system';
    systemf  = true;
    squery = {system:true};
  }
  let astr = path.join(res.locals.gpath, usrHome + '/');  
  let menuItemsPromise = new Promise( (resolve, reject) => {
    let tree = dirTree(path.join(res.locals.gpath, usrHome + '/'));
    let allDirs = [];
    allDirs = DirsFromTree(tree, allDirs);
    if (allDirs[0]) {
      resolve(allDirs);
      } else {
      let error = "No Directories";
      reject(error);
      }
  });

  let searchStr = new RegExp('^.*' + req.query.q);
  let searchResults = new Promise( (resolve, reject) => {
    find.file(searchStr, path.join(res.locals.gpath, usrHome + '/'),function(files) {
      resolve(files);
    }).error(function(err) {
      if (err) {
        reject(err);
      }
    })
})

let menuitems =  await menuItemsPromise;
   
searchResults
.then(function (result) {
  if (result.length === 0) {
    req.flash('info', 'No results. Please try another search');
    res.redirect(url.format({
       pathname:'/images-album/'+menuitems[0].path.replace(/\\/g," "),
       query:squery
    }));
  return; 
  }

    let allImages = [];
    for (i=0; i < result.length; i++) {
      let fileLocation =  result[i];
      let stat = fs.statSync(fileLocation);    
        if (stat && stat.isFile() && ['.jpg', '.png'].indexOf(path.extname(fileLocation)) != -1) {
          let dimensions = sizeOf(result[i]);
          let imagepath = result[i].replace(res.locals.gpath, '/gallery/');
          let imageObj = {
            pathf: result[i],
            path :  imagepath,
            name : path.basename(result[i]),
            height : dimensions.height,
            width : dimensions.width,
            created : stat.atime
          };
          allImages.push(imageObj);
        }
    }
     if (sortorder === 'created') {
    allImages.sort(function(a,b){
    return new Date(b.created) - new Date(a.created);
    });
    } else { 
    allImages.sort(function(a,b) {
    return a.name - b.name;
    });
  }
  // //set default variables
  // let totalImages = allImages.length,
  // pageSize = 6,
  // currentPage = 1,
  // ImagesArrays = [], 
  // ImagesPage = [];
  
  // while (allImages.length > 0) {
  //   ImagesArrays.push(allImages.splice(0, pageSize));
  // }
  // pageCount = ImagesArrays.length;
  
  // if (typeof req.query.page !== 'undefined') {
  //   currentPage = +req.query.page;
  // }
  
  // ImagesPage = ImagesArrays[+currentPage - 1];

  res.render('gallery/images1', 
  { title: 'Node js',
    user:req.user, 
    images: allImages,
    album: false,
    search: true,
    systemf: systemf,
    // pageSize: pageSize,
    // pageCount: pageCount,
    // currentPage: currentPage,
    items: menuitems,
    ptitle: 'Search Results'        
  });
      }, function(error) {
      //res.redirect('/homereg');
      console.log(error); 
      });

};

exports.renameAlbum = async (req, res) => {
  let newpath = req.body.before.replace(/%20/g, '\\');
  newpath = newpath.slice(14);
  let after = newpath.slice(0, -req.body.dirname.length) + req.body.id;  
  fs.renameSync(newpath, after);
};

exports.renameImage = async (req, res) => {
  let astr = path.join(res.locals.gpath, req.user.homeDir + '/');
  let test = url.parse(req.body.dirname);
  let al = decodeURI(test.pathname.slice(14));
  let newpath = al.replace(/\s/g, '\\');
   if (!newpath.includes(astr)) {
    newpath = astr  + newpath;
  }
  let filename = req.body.id;
  let exist = fs.existsSync(newpath + '/' + filename);
     if (exist) {
       let extension = filename.split('.')[1];
       filename = filename.substring(0, extension.length);
       filename = filename + crypto.randomBytes(10).toString('hex') + '.' + extension;
       fs.renameSync(newpath + '\\' + req.body.before, newpath + '\\' + filename)
     } else {
       fs.renameSync(newpath + '\\' + req.body.before, newpath + '\\' + req.body.id);
     }
  
};
