// *****************************************************************************
// Modules section
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();


// *****************************************************************************
// use and set section
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.json());
app.use(express.static("public"));

app.use(session({

    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false

}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets"
    },
    (accessToken, refreshToken, profile, cb) => {
        User.findOrCreate({
            googleId: profile.id
        }, (err, user) => {
            return cb(err, user);
        });
    }
));




// *****************************************************************************
// MongoDB section

const mongoConnect = async () => {
    mongoose.connect(process.env.URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }, () => {
        console.log("Connected correctly to server");
    });
}

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });


// *****************************************************************************
// Main section

const run = async () => {
    try {

        // Connection to mongo
        await mongoConnect();

        // Home route
        app.get("/", (req, res) => {
            res.render("home");
        });

        // Google route
        app.route("/auth/google")

            .get(passport.authenticate("google", {
                scope: ["email", "profile"]
            }));

        app.route("/auth/google/secrets")
            .get(passport.authenticate("google", {
                failureRedirect: "/login"
            }), (req, res) => {
                res.redirect("/secrets");
            });



        // Login route
        app.route("/login")

            .get((req, res) => {
                res.render("login");
            })

            .post(passport.authenticate("local", {
                failureRedirect: "/login"
            }), (req, res) => {

                const user = new User({
                    username: req.body.username,
                    password: req.body.password
                });
                req.login(user, (err) => {
                    if (err) {
                        console.log(err);
                    } else {
                        res.redirect("/secrets");

                    }
                });

            });


        // Register route
        app.route("/register")

            .get((req, res) => {
                res.render("register");
            })

            .post((req, res) => {

                User.register({
                    username: req.body.username
                }, req.body.password, (err, user) => {
                    if (err) {
                        console.log(err);
                        res.redirect("/register");
                    } else {
                        passport.authenticate("local")(req, res, () => {
                            res.redirect("/secrets");
                        });
                    }
                });

            });

        app.get("/logout", (req, res) => {
            req.logout();
            res.redirect("/")
        });

        app.get("/secrets", (req, res) => {
            res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0');

            if (req.isAuthenticated()) {
                res.render("secrets");
            } else {
                res.redirect("/login");
            }
        });




        // *****************************************************************************
        // Listen section
        app.listen(3000, () => {
            console.log("Server open at 3000 port!");
        });
    } catch (err) {
        console.log(err)
    }
}

run().catch(console.dir);