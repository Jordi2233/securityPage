// *****************************************************************************
// Modules section
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const https = require('https');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');
const bcrypt = require('bcrypt');
const saltRounds = 10;


const app = express();


// *****************************************************************************
// use and set section
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));


// *****************************************************************************
// MongoDB section

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});


userSchema.plugin(encrypt, {
    secret: process.env.SECRET,
    encryptedFields: ["password"]
});

const User = new mongoose.model("User", userSchema);

// *****************************************************************************
// Main section

const run = async () => {
    try {

        // Connection to mongo
        mongoose.connect(process.env.URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }, () => {
            console.log("Connected correctly to server");
        });


        // Home route
        app.get("/", (req, res) => {
            res.render("home");
        });


        // Login route
        app.route("/login")

            .get((req, res) => {
                res.render("login");
            })

            .post((req, res) => {

                const username = req.body.username;
                const password = req.body.password;

                User.findOne({
                    email: username
                }, (err, foundUser) => {
                    if (err) return console.log(err);
                    else {
                        if (foundUser) {
                            bcrypt.compare(password, foundUser.password, (err, result) => {
                                if (result === true) {
                                    res.render("secrets")
                                }
                            });
                        }

                    }
                })

            });


        // Register route
        app.route("/register")

            .get((req, res) => {
                res.render("register");
            })
            .post((req, res) => {

                const hash = bcrypt.hashSync(req.body.password, saltRounds);

                const newUser = new User({
                    email: req.body.username,
                    password: hash
                });

                newUser.save((err) => {
                    if (err) return console.log(err);
                    else {
                        console.log("Element successfully added!");
                        res.render("secrets");
                    }
                })

            });

        app.get("/logout", (req, res) => {
            res.redirect("/")
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