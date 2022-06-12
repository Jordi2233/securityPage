// *****************************************************************************
// Modules section
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocal = require("passport-local")
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github').Strategy;
const findOrCreate = require("mongoose-findorcreate");
const e = require('express');


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
    githubId: String,
    secret: Array
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

// Passport strategy section

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets"
    },
    (accessToken, refreshToken, profile, cb) => {
        User.findOrCreate({
            username: profile.emails[0].value,
            googleId: profile.id
        }, (err, user) => {
            return cb(err, user);
        });
    }
));

passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/github/secrets"
    },
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({
            githubId: profile.id
        }, (err, user) => {
            return cb(err, user);
        });
    }
));







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

        // Github route
        app.route("/auth/github")
            .get(passport.authenticate('github'));

        app.get("/auth/github/secrets",
            passport.authenticate('github', {
                failureRedirect: '/login'
            }),
            function (req, res) {
                res.redirect("/secrets");
            });


        // Login route
        app.route("/login")

            .get((req, res) => {
                res.render("login");
            })

            .post(passport.authenticate('local', {
                successRedirect: '/secrets',
                failureRedirect: '/login'
            }));


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

        app.route("/submit")
            .get((req, res) => {
                res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0');

                if (req.isAuthenticated()) {
                    res.render("submit");
                } else {
                    res.redirect("/login");
                }
            })
            .post((req, res) => {
                const submittedSecret = req.body.secret;
                User.findById(req.user._id, (err, foundUser) => {
                    if (err) {
                        console.log(err);
                    }
                    if (foundUser) {
                        User.updateOne({
                            _id: foundUser._id
                        }, {
                            $push: {
                                secret: submittedSecret
                            }
                        }, (err) => {
                            if (err) {
                                console.log(err);
                            } else {
                                res.redirect("/secrets");
                            }
                        });
                    }
                })

            });

        app.get("/secrets", (req, res) => {
            User.find({
                "secret": {
                    $ne: null
                }
            }, (err, foundUsers) => {
                if (err) {
                    console.log(err);
                } else {
                    if (foundUsers) {
                        res.render("secrets", {
                            usersWithSecrets: foundUsers
                        });
                    }
                }
            });
        });

        app.get("/logout", (req, res) => {
            req.logout();
            res.redirect("/")
        });




        // *****************************************************************************
        // Listen section
        app.listen(process.env.PORT || 3000, () => {
            console.log("Server open at 3000 port!");
        });
    } catch (err) {
        console.log(err)
    }
}

run().catch(console.dir);