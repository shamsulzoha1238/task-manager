var express = require('express');
var router = express.Router();



const userModel = require("../models/userModel");



const TodoModel = require("../models/todoModel");



//-------------------filesystem ko require karna----------------------------------------------------


const fs = require("fs");

// ---------------------multer ko require karna------------------------------------------------------


const upload = require("../utils/multer");


// ----------------------------END multer--------------------------------------------------------------




// ------------passport ko require karna and authenticate karna-----------------------------------------

const passport = require("passport");
const LocalStrategy = require("passport-local");
const { sendmail } = require("../utils/mail");

passport.use(new LocalStrategy(userModel.authenticate()));


// --------------------------------END--------------------------------------------------------------------


// -------------------------------------Home-page 1----------------------------------------------------------


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Homepage' ,user: req.user });
});



// ---------------------------------Signup-page---------------------------------------------------------


router.get("/signup", function (req, res, next) {
    res.render("signup", { title: "Sign-Up", user: req.user });
});

router.post("/signup", async function (req, res, next) {
    try {
        const { username, password, email } = req.body;
        const user = await userModel.register({ username, email }, password);
        res.redirect("/signin");
    } catch (error) {
        res.send(error.message);
    }
});



// ---------------------------------Signin-page----------------------------------------------------------


router.get("/signin", function (req, res, next) {
    res.render("signin", { title: "Sign-In", user: req.user });
});

router.post(
    "/signin",
    passport.authenticate("local", {
        failureRedirect: "/signin",
        successRedirect: "/home",
    }),
    function (req, res, next) {}
);

// -----------------------------Home page2---------------------------------------------------------------


router.get("/home", isLoggedIn, async function (req, res, next) { 
    try {
        console.log(req.user);
        // const user = await UserModel.findById(req.user._id).populate("todos");
        const { todos } = await req.user.populate("todos");
        console.log(todos);
        res.render("home", { title: "Home", todos, user: req.user });
    } catch (error) {
        res.send(error);
    }
});


// ----------------------------End Home page2-------------------------------------------------------------



// ---------------------------------Profile-page----------------------------------------------------------


router.get("/profile", isLoggedIn, async function (req, res, next) {
    try {
        res.render("profile", { title: "Profile", user: req.user });
    } catch (error) {
        res.send(error);
    }
});


router.post(
    "/avatar",
    upload.single("avatar"),
    isLoggedIn,
    async function (req, res, next) {
        try {
            if (req.user.avatar !== "default.jpg") {
                fs.unlinkSync("./public/images/" + req.user.avatar);
            }
            req.user.avatar = req.file.filename;
            req.user.save();
            res.redirect("/profile");
        } catch (error) {
            res.send(error);
        }
    }
);


// -----------------------------------signout--------------------------------------------------
router.get("/signout", async function (req, res, next) {
    req.logout(() => {
        res.redirect("/signin");
    });
});



// ---------------------------------Delete-page-----------------------------------------------------------


router.get("/delete/:id", async function (req, res, next) {
    try {
        await userModel.findByIdAndDelete(req.params.id);
        res.redirect("/profile");
    } catch (error) {
        res.send(error);
    }
});



// ---------------------------------Update-page---------------------------------------------------------


router.get("/update/:id", async function (req, res, next) {
    try {
        const User = await userModel.findById(req.params.id);
        res.render("update", { title: "Update", User, user: req.user });
    } catch (error) {
        res.send(error);
    }
});

router.post("/update/:id", async function (req, res, next) {
    try {
        await userModel.findByIdAndUpdate(req.params.id, req.body);
        res.redirect("/profile");
    } catch (error) {
        res.send(error);
    }
});



// --------------------------------Get-email-page---------------------------------------------------------


router.get("/get-email", function (req, res, next) {
    res.render("get-email", { title: "Forget-Password", user: req.user });
});

router.post("/get-email", async function (req, res, next) {
    try {
        const user = await userModel.findOne({ email: req.body.email });

        if (user === null) {
            return res.send(
                `User not found. <a href="/get-email">Forget Password</a>`
            );
        }
        sendmail(req, res, user);
    } catch (error) {
        res.send(error);
    }
});





// ---------------------------------Change-password---------------------------------------------------------

router.get("/changepassword/:id", function (req, res, next) {
    res.render("changepassword", {
        title: "Change Password",
        id: req.params.id,
        user: null,
    });
});

router.post("/change-password/:id", async function (req, res, next) {
    try {
        const user = await userModel.findById(req.params.id);
        if (user.passwordResetToken === 1) {
            await user.setPassword(req.body.password);
            user.passwordResetToken = 0;
        } else {
            res.send(
                `link expired try again <a href="/get-email">Forget Password</a>`
            );
        }
        await user.save();

        res.redirect("/signin");
    } catch (error) {
        res.send(error);
    }
});



// ---------------------------------Reset-password---------------------------------------------------------

router.get("/reset/:id", isLoggedIn, async function (req, res, next) {
    res.render("reset", {
        title: "Reset Password",
        id: req.params.id,
        user: req.user,
    });
});


router.post("/reset/:id", isLoggedIn, async function (req, res, next) {
    try {
        await req.user.changePassword(req.body.oldpassword, req.body.password);
        await req.user.save();
        res.redirect("/profile");
    } catch (error) {
        res.send(error);
    }
});


// -------------------------jab user login hai use redirect kar do signin par---------------------------------


function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/signin");
}





// -------------------------------------Todo start----------------------------------------------------------



router.get("/createtodo", isLoggedIn, async function (req, res, next) {
    res.render("createtodo", {
        title: "Create Todo",
        user: req.user,
    });
});

router.post("/createtodo", isLoggedIn, async function (req, res, next) {
    try {
        const todo = new TodoModel(req.body);
        todo.user = req.user._id;
        req.user.todos.push(todo._id);
        await todo.save();
        await req.user.save();
        res.redirect("/home");
    } catch (error) {
        res.send(error);
    }
});

router.get("/updatetodo/:id", isLoggedIn, async function (req, res, next) {
    try {
        const todo = await TodoModel.findById(req.params.id);
        res.render("updatetodo", {
            title: "Update Todo",
            user: req.user,
            todo,
        });
    } catch (error) {
        res.send(error);
    }
});

router.post("/updatetodo/:id", isLoggedIn, async function (req, res, next) {
    try {
        await TodoModel.findByIdAndUpdate(req.params.id, req.body);
        res.redirect("/home");
    } catch (error) {
        res.send(error);
    }
});

router.get("/deletetodo/:id", isLoggedIn, async function (req, res, next) {
    try {
        await TodoModel.findByIdAndDelete(req.params.id);
        res.redirect("/home");
    } catch (error) {
        res.send(error);
    }
});

module.exports = router;

