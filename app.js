if (process.env.NODE_ENV != "production") {
    require('dotenv').config();
}

const express = require("express");  /*Imports the Express.js framework.*/
const app = express();               /*Creates your Express application/server. */
const mongoose = require("mongoose");/* Mongoose helps Node.js work with MongoDB.*/  //Node.js → Mongoose → MongoDB
// const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";  /*This is your MongoDB connection URL.*/


const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

const dburl = process.env.ATLASDB_URL;
/*mongodb://     → MongoDB protocol */
/*127.0.0.1      → Your own computer */
/*27017          → Default MongoDB port */
/*test           → Database name */
/*Connect to the test database running on my computer. */

main().then(() => {                    /*Calls the main function */  //Because main() is an async function, it returns a Promise.
    console.log("conncected to DB");  //If MongoDB connects successfully:
}).catch(err => {                     //If MongoDB connection fails, it prints the error.        
    console.log(err);
})
async function main() {              /*Creates an asynchronous function named main.*/  //async allows you to use await.
    await mongoose.connect(dburl) /*Connect to MongoDB using MONGO_URL and wait until the connection process completes.*/
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.engine("ejs", ejsMate);

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));   //This is required only for Edit, Update, and Delete routes. It does not affect
app.use(express.static(path.join(__dirname, "public")));

const store = MongoStore.create({
    mongoUrl: dburl,
    crypto: {
        secret: process.env.SECRET
    },
    touchAfter: 24 * 3600,
});

store.on("error", (err) => {
    console.log("Error in MONGO SESSION STORE", err);
});


const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 1000 * 60 * 60 * 24 * 3,
        httpOnly: true
    }
};


//==============================CREATE ROUTE =========================================//
// app.get("/", (req, res) => {        /*Creates a GET route for / */   //req = request from user/browser.    //  res = response sent by server. 
//     res.send("Hi i am website Admin");   /*Sends this text to the browser: */
// });



app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

app.get("/demouser", async (req, res) => {
    let fakeUser = new User({
        email: "student2@gmail.com",
        username: "delta-student2"
    });

    let registeredUser = await User.register(fakeUser, "helloworld");
    res.send(registeredUser);
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

// ========================== HOME PAGE ROUTE ==========================

app.get("/", (req, res) => {
    res.redirect("/listings");
});

// ==========================404 ROUTE=============

app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"))
})


//======================== ERROR HANDLER =============
app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong!" } = err;
    res.status(statusCode).render("error.ejs", { message });
    // res.status(statusCode).send(message);
})


const port = process.env.PORT || 8080;

app.listen(port, () => {
    console.log(`server is listening to port ${port}`);
}); 
