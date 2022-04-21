// *****************************************************************************
// Modules section
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');


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
    password: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


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