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
const axios = require('axios');
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

app.use(express.static('public'));

// Handlebars Setup
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: __dirname + '/views/layouts/'
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