// Dependencies
const express = require('express');
const app = express();
const { engine } = require('express-handlebars');
const session = require('express-session');
const fs = require('fs');
const connectSqlite3 = require('connect-sqlite3');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('mydatabase.db');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt');
const path = require('path');
const axios = require('axios');
const multer = require('multer');
require('dotenv').config();

// Middleware
app.use(bodyParser.urlencoded({ extended: false  }));
app.use(bodyParser.json());

const sqlitestore = connectSqlite3(session);

app.use(session({
  store: new sqlitestore({ db: 'sessions.db'}),
  "saveUninitialized": false, 
  "resave": false,
  "secret": process.env.SESSION_SECRET,
}));





const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let destination;
    switch (file.fieldname) {
      case 'butimg':
        destination = './public/img/butiker/';
        break;
      default:
        destination = './public/img/';
    }

    cb(null, destination);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); // one billion
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage, 
  fileFilter: (req, file, cb) => {
    const isButikImage = file.fieldname === 'butimg';

    if (isButikImage && !file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only images are allowed!'));
    }
    if (!isButikImage && !file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only images are allowed!'));
    }
    cb(null, true);
  }
});

app.use('/admin-only', (req, res, next) => {
  if (req.session.isAdmin) {
    next();
  } else {
    res.status(403).send('Access Forbidden');
  }
});




app.use(express.static('public'));

// Handlebars Setup
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: __dirname + '/views/layouts/',
  helpers: {
    json: function(context) {
      return JSON.stringify(context);
    }
  }
}));
app.set('view engine', 'handlebars');
app.set('views', './views');





//Database
/* users */
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    uid INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    isAdmin INTEGER DEFAULT 0,
    creationDate DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
/* butiker */
db.run(`
  CREATE TABLE IF NOT EXISTS butiker (
    bid INTEGER PRIMARY KEY AUTOINCREMENT,
    bname TEXT,
    byear INTEGER,
    bdesc TEXT,
    btype TEXT,
    bstatus TEXT,
    bimgURL TEXT,
    bimgAlt TEXT,
    burl TEXT
  );
`);
/* stores */
db.run(`
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  url TEXT,
  district TEXT
);
`);


const storesData = JSON.parse(fs.readFileSync('./stores.json', 'utf8'));

const insertStoreData = () => {
  const stmt = db.prepare("INSERT OR IGNORE INTO stores (name, url, district) VALUES (?, ?, ?)");

  storesData.forEach(store => {
    stmt.run([store.name, store.url, store.district]);
  });

  console.log('Stores.json data inserted successfully!');
  stmt.finalize();
};

//insertStoreData(); 



const butikerData = [
  {
    bname: "Mc Donalds",
    byear: 2023,
    bdesc: "Hamburgare",
    btype: "Restaurang",
    bstatus: "Oppet",
    bimgURL: "/img/butiker/mc.jpg",
    bimgAlt: "mc donalds restaurang",
    burl: "mcdonalds.com",
  },
  {
    bname: "Clas Ohlsson",
    byear: 2022,
    bdesc: "Bra att ha saker",
    btype: "Teknik",
    bstatus: "Oppet",
    bimgURL: "/img/butiker/clas.jpg",
    bimgAlt: "clas ohlsson butik",
    burl: "",
  },
];

// Insert admin into users table ************************ ONLY RUN ONCE ********************************
/* const adminUsername = 'admin';
const adminPassword = process.env.ADMIN_PASSWORD;

bcrypt.hash(adminPassword, 10, (err, hashedPassword) => {
  if (err) {
    console.error('Error hashing password:', err);
  } else {
    db.run(
      'INSERT INTO users (username, password, isAdmin) VALUES (?, ?, ?)',
      [adminUsername, hashedPassword, 1],
      (error) => {
        if (error) {
          console.error('Error inserting admin user:', error);
        } else {
          console.log('Admin inserted successfully!');
        }
      }
    );
  }
}); */


// Insert data into butiker tabel ************************ ONLY RUN ONCE ********************************
/* for (const butik of butikerData) {
  db.run(
    `INSERT INTO butiker (bname, byear, bdesc, btype, bstatus, bimgURL, bimgAlt, burl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [butik.bname, butik.byear, butik.bdesc, butik.btype, butik.bstatus, butik.bimgURL, butik.bimgAlt, butik.burl],
    (error) => {
      if (error) {
        console.error('Error inserting butik: ', error);
      } else {
        console.log('butik inserted successfully!');
      }
    }
  );
}
 */

// Butik Route
app.get('/butiker', (req, res) => {
  db.all("SELECT * FROM butiker ORDER BY byear DESC", (error, theButiker) => {
    if(error){
      const model = {
        dbError: true,
        theError: error,
        butiker: [],
        IsLoggedIn: req.session.isLoggedIn,
        IsAdmin: req.session.isAdmin,
        name: req.session.name
      }
      res.render('butiker.handlebars', model)
    } else{
      const model = {
        dbError: false,
        theError: "",
        butiker: theButiker.map(butik => {
          let butikStatusO;
          let butikStatusS;
          if (butik.bstatus === "Oppet") {
            butikStatusO = "Oppet";
            return {
              ...butik,
              butikStatusO: butikStatusO
            };
          } else if (butik.bstatus === "Stangt") {
            butikStatusS = "Stangt";
            return {
              ...butik,
              butikStatusS: butikStatusS
            };
          } else {
            return{
              ...butik,
              butikStatusO: "", 
              butikStatusS: "", 
            }
          }
        }),
        IsLoggedIn: req.session.isLoggedIn,
        IsAdmin: req.session.isAdmin,
        name: req.session.name
      }
      res.render('butiker.handlebars', model)
    }
  });
});

// Ny Butik Route
app.get('/butik/new', (req, res) => {
  if(req.session.isLoggedIn==true && req.session.isAdmin==true){
      const model = {
        IsLoggedIn: req.session.isLoggedIn,
        IsAdmin: req.session.isAdmin,
        name: req.session.name,
        showBackButton: true
      }
      res.render('nybutik.handlebars', model)
    } else{
      res.redirect('/login', model)
    }
});
app.post('/butik/new', upload.single('butimg'), (req, res) => {
  const newP = [
    req.body.butname,
    req.body.butyear,
    req.body.butdesc,
    req.body.buttype,
    req.body.butstatus,
    req.file ? `/img/butiker/${req.file.filename}` : '/img/default_butik.jpg',
    req.body.butImgAlt,
    req.body.butURL
  ];

  if(req.session.isLoggedIn == true && req.session.isAdmin == true){
    db.run("INSERT INTO butiker (bname, byear, bdesc, btype, bstatus, bimgURL, bimgAlt, bURL) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", newP, (error) => {
      if(error){
        console.log('ERROR: ' + error)
      } else{
        console.log('New butik added')
      }
      res.redirect('/butiker');
    });
  } else{
    res.redirect('/login');
  }
});

// Details about a butik
app.get('/butik/:id', (req, res) => {
  const butikId = req.params.id;

  db.get('SELECT * FROM butiker WHERE bid=?', [butikId], (error, butik) => {
    if (error) {
      console.error('Error fetching butik details:', error);
      res.render('404.handlebars');
      return;
    };

      const model = {
        butik: butik,
        IsLoggedIn: req.session.isLoggedIn,
        IsAdmin: req.session.isAdmin,
        name: req.session.name,
        showBackButton: true
      };

      res.render('butikdetaljer.handlebars', model);
    });
  });
;




// Sends the form to modify a butik
app.get('/butiker/update/:id', (req, res) => {
  const id = req.params.id
  db.get("SELECT * FROM butiker WHERE bid=?", [id], (error, theButik) => {
    if(error){
      console.log('ERROR: ' + error)
      const model = { dbError: true, theError: error,
        butik: [],
        IsAdmin: req.session.isAdmin,
        IsLoggedIn: req.session.isLoggedIn,
        name: req.session.name
      }
      console.log("test")
      res.render('redigerabutik.handlebars', model)
    } else {
      const model = {
        dbError: false,
        theError: "",
        butik: theButik,
        IsAdmin: req.session.isAdmin,
        IsLoggedIn: req.session.isLoggedIn,
        name: req.session.name,
        helpers: {
          theTypeR(value) { return value == "Restaurang"; },
          theTypeI(value) { return value == "Inredning"; },
          theTypeT(value) { return value == "Teknik"; },
          theTypeS(value) { return value == "Second Hand"; },

          theStatusO(value) { return value == "Oppet";},
          theStatusS(value) { return value == "Stangt";},
        },
        showBackButton: true
      }
      res.render('redigerabutik.handlebars', model)
    }
  });
});

//Modifies an existing butik
app.post('/butiker/update/:id', (req, res) => {
  const id = req.params.id
  const newB = [
    req.body.butname,
    req.body.butyear,
    req.body.butdesc,
    req.body.buttype,
    req.body.butstatus,
    req.body.butimg,
    req.body.butimgalt,
    req.body.buturl,
    id
  ]
  if(req.session.isLoggedIn==true && req.session.isAdmin==true){
    db.run("UPDATE butiker SET bname=?, byear=?, bdesc=?, btype=?, bstatus=?, bimgURL=?, bimgAlt=?, burl=? WHERE bid=?", newB, (error) => {
      if(error) {
        console.log('ERROR: ' + error)
      } else {
        console.log('Butik updated')
      }
      res.redirect('/butiker')
    });
  } else {
    res.redirect('/login')
  }
});

// Butik Deletion Route
app.get('/butiker/delete/:id', (req, res) => {
  const id = req.params.id

  if (req.session.isLoggedIn == true && req.session.isAdmin == true) {
    db.get('SELECT bimgURL FROM butiker WHERE bid=?', [id], (error, butik) => {
      if (error) {
        console.log('ERROR: ' + error);
      } else {
        const imgPath = './public' + butik.bimgURL;

        db.run('DELETE FROM butiker WHERE bid=?', [id], (error) => {
          if (error) {
            console.log('ERROR: ' + error);
          } else {

            // Delete the image file
            fs.unlink(imgPath, (unlinkError) => {
              if (unlinkError) {
                console.log('Butik deleted')
                console.log('Error deleting butik-image: ' + unlinkError);
              } else {
                console.log('Butik and butik-image deleted');
              }
            });
          }
        });
        res.redirect('/butiker');
      }
    });
  } else {
    res.redirect('/login');
  }
});


// Home Route
app.get('/', (req, res) => {
  console.log('SESSION: ', req.session);
  const model = {
    IsAdmin: req.session.isAdmin,
    IsLoggedIn: req.session.isLoggedIn,
    name: req.session.name
  };
  res.render('home.handlebars', model);
});
app.get('/nyheter', (req, res) => {
  console.log('SESSION: ', req.session);
  const model = {
    IsAdmin: req.session.isAdmin,
    IsLoggedIn: req.session.isLoggedIn,
    name: req.session.name
  };
  res.render('nyheter.handlebars', model);
});
app.get('/shopping', (req, res) => {
  console.log('SESSION: ', req.session);
  const model = {
    IsAdmin: req.session.isAdmin,
    IsLoggedIn: req.session.isLoggedIn,
    name: req.session.name
  };
  res.render('shopping.handlebars', model);
});
app.get('/seevardheter', (req, res) => {
  console.log('SESSION: ', req.session);
  const model = {
    IsAdmin: req.session.isAdmin,
    IsLoggedIn: req.session.isLoggedIn,
    name: req.session.name
  };
  res.render('seevardheter.handlebars', model);
});
app.get('/mat', (req, res) => {
  console.log('SESSION: ', req.session);
  const model = {
    IsAdmin: req.session.isAdmin,
    IsLoggedIn: req.session.isLoggedIn,
    name: req.session.name
  };
  res.render('mat.handlebars', model);
});
app.get('/barer', (req, res) => {
  console.log('SESSION: ', req.session);
  const model = {
    IsAdmin: req.session.isAdmin,
    IsLoggedIn: req.session.isLoggedIn,
    name: req.session.name
  };
  res.render('barer.handlebars', model);
});
app.get('/historia', (req, res) => {
  console.log('SESSION: ', req.session);
  const model = {
    IsAdmin: req.session.isAdmin,
    IsLoggedIn: req.session.isLoggedIn,
    name: req.session.name
  };
  res.render('historia.handlebars', model);
});
app.get('/butiker', (req, res) => {
  console.log('SESSION: ', req.session);
  const model = {
    IsAdmin: req.session.isAdmin,
    IsLoggedIn: req.session.isLoggedIn,
    name: req.session.name
  };
  res.render('butiker.handlebars', model);
});



app.get('/stores', (req, res) => {
  console.log('SESSION: ', req.session);

const districtCounts = storesData.reduce((acc, store) => {
  if (store.district) {
      acc[store.district] = (acc[store.district] || 0) + 1;
  }
  return acc;
}, {});


  const model = {
    IsAdmin: req.session.isAdmin,
    IsLoggedIn: req.session.isLoggedIn,
    name: req.session.name,
    stores: storesData,
    districtCounts: districtCounts
  };
  res.render('stores.handlebars', model);
});








app.get('/login', (req, res) => {
  req.session.returnTo = req.headers.referer || '/';

  const model =  {
    IsAdmin: req.session.isAdmin,
    IsLoggedIn: req.session.isLoggedIn,
    name: req.session.name
  }
  res.render("login.handlebars", model);
});
app.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  
  // Select user from  database
  db.get('SELECT * FROM users WHERE username=?', [username], (error, user) => {
      if (error) {
          console.error(error);
          req.session.isAdmin = false;
          req.session.isLoggedIn = false;
          req.session.name = "";
          res.redirect("/login");
      } else if (user) {
          // Compare hashed password
          bcrypt.compare(password, user.password, (bcryptError, result) => {
              if (bcryptError) {
                  console.error(bcryptError);
                  req.session.isAdmin = false;
                  req.session.isLoggedIn = false;
                  req.session.name = "";
                  res.redirect("/login");
              } else if (result) {
                  // Passwords match, user is authenticated
                  console.log(user.username + ' logged in')
                  req.session.isAdmin = user.isAdmin;
                  req.session.isLoggedIn = true;
                  req.session.name = user.username;
                  res.redirect(req.session.returnTo || '/');
              } else {
                  // Passwords don't match
                  req.session.isAdmin = false;
                  req.session.isLoggedIn = false;
                  req.session.name = "";
                  res.redirect("/login");
              }
          });
      } else {
          // User not found
          req.session.isAdmin = false;
          req.session.isLoggedIn = false;
          req.session.name = "";
          res.redirect("/login");
      }
  });
});

// Logout Route
app.get('/logout', (req, res) => {
  const referer = req.headers.referer || '/';
  res.locals.returnTo = referer;
  
  if (req.session) {
    const username = req.session.name;
    
    req.session.destroy((err) => {
      if (err) {
        console.log('Error while destroying the session: ' + err)
      }
      console.log(`${username} logged out`)
    });
  } else {
    console.log('No session to destroy')
  }

  res.redirect(res.locals.returnTo);
});

app.get('/register', (req, res) => {
  const model = {
      IsAdmin: req.session.isAdmin,
      IsLoggedIn: req.session.isLoggedIn,
      name: req.session.name
  };
  res.render('register.handlebars', model);
});
app.post('/register', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  
  const minLength = 8;
  const maxLength = 64;

  if (password.length < minLength || password.length > maxLength) {
    return res.render('register.handlebars', { errorMessage: 'Password must be between 8 and 64 characters long.' });
  }

  db.get('SELECT * FROM users WHERE username=?', [username], (error, existingUser) => {
      if (error) {  
          console.error(error);
          res.redirect('/register');
      } else if (existingUser) {
          res.render('register.handlebars', { errorMessage: 'Username is already taken, please try again' });
      } else {
          bcrypt.hash(password, 10, (hashError, hashedPassword) => {
              if (hashError) {
                  console.error(hashError);
                  res.redirect('/register');
              } else {
                  db.run('INSERT INTO users (username, password, creationDate) VALUES (?, ?, DATETIME("now", "localtime"))', [username, hashedPassword], (insertionError) => {
                      if (insertionError) {
                          console.error('ERROR: ' + insertionError);
                          res.redirect('/register');
                      } else {
                          console.log(`${username} created an account`);
                          res.redirect('/login');
                        }
                     });
                 }
        });
       }
  });
});


// Admin Route
app.get('/admin', (req, res) => {
  if (req.session.isAdmin) {
  db.all('SELECT * FROM users', (error, users) => {
    if (error) {
      console.error('Error fetching users:', error);
    } else {
        const model = {
          users: users,
          IsAdmin: req.session.isAdmin,
          IsLoggedIn: req.session.isLoggedIn,
          name: req.session.name,
          showBackButton: true,
        }
        res.render('admin.handlebars', model);
    }
  });
} else {
  res.redirect('/login')
}
});


app.post('/admin/users/update/:uid', (req, res) => {
  const userId = req.params.uid;
  const newUsername = req.body.newUsername;
  const newPassword = req.body.newPassword;

  // Fetch the current user details from the database
  db.get('SELECT * FROM users WHERE uid = ?', [userId], (error, user) => {
    if (error) {
      console.error('Error fetching user details:', error);
      res.status(500).send('Internal Server Error');
    } else {
      // If newPassword is provided and different, encrypt it
      const encryptedPassword = newPassword && newPassword !== user.password
        ? bcrypt.hashSync(newPassword, 10)
        : user.password;

      // Update User Details in the Database
      db.run('UPDATE users SET username = ?, password = ? WHERE uid = ?', [newUsername, encryptedPassword, userId], (updateError) => {
        if (updateError) {
          console.error('Error modifying user:', updateError);
          res.status(500).send('Internal Server Error');
        } else {
          console.log(`${req.session.name} updated details of ${user.username}`)
          if (user.username != newUsername){
            console.log(`\t* Username was changed to ${newUsername}`)
            if (newPassword !== user.password){
              console.log('\t* Password was changed')
            }
          } else if (newPassword !== user.password){
            console.log('\t* Password was changed')
          }
          else {
            console.log('\t* Unknown changes was made')
          }
          res.redirect('/admin');
        }
      });
    }
  });
});


// Delete users
app.post('/admin/users/delete/:uid', (req, res) => {
  const uid = req.params.uid;

  if (req.session.isLoggedIn == true && req.session.isAdmin == true) {
    db.run('DELETE FROM users WHERE uid=?', [uid], (error) => {
      if (error) {
        console.error('Error deleting user:', error);
      } else {
        console.log('User deleted successfully!');
        res.redirect('/admin');
      }
    });
  } else {
    res.redirect('/login');
  }
});



// 404 Route
app.use((req, res) =>{
  const model = {
    IsAdmin: req.session.isAdmin,
    IsLoggedIn: req.session.isLoggedIn,
    name: req.session.name
  }
  res.status(404).render('404.handlebars', model);
});

// Server Start
const port = 80;
app.listen(port, () => {
  console.log(`Server running and listening on port ${port}...`)
});