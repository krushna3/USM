const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const { response } = require('../routes/userRoutes');
const userModel = require('../models/userModel');
const randomString = require('randomstring');
const config = require('../config/config');
const nodemailer = require('nodemailer');



const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.log(error.message);
    }
}
const addUserMail = async (name, email, password, user_id) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: config.emailUser,
                pass: config.emailPassword
            }
        });
        const mailOptions = {
            from: config.emailUser,
            to: email,
            subject: 'Admin Add You And Verify Your Mail',
            html: '<p>hii ' + name + ', please click here to <a href = "http://localhost:3000/verify?id=' + user_id + '"> Verify</a> Your mail.</p> <br><br> <b>Email :- </b> ' + email + '<br> <b> Password :- </b>' + password + ''
        }
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            }
            else {
                console.log("Email hass been send:-", info.response);
            }
        })
    } catch (error) {
        console.log(error.message);
    }
}

const sendvReaetPasswordMail = async (name, email, token) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: config.emailUser,
                pass: config.emailPassword
            }
        });
        const mailOptions = {
            from: config.emailUser,
            to: email,
            subject: 'For Reset Password',
            html: '<p>hii ' + name + ', please click here to <a href = "http://localhost:3000/admin/forget-password?token=' + token + '"> Reset </a> Your Password.</p>'
        }
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            }
            else {
                console.log("Email hass been send:-", info.response);
            }
        })
    } catch (error) {
        console.log(error.message);
    }
}

const loadLogin = async (req, res) => {
    try {
        res.render('login')
    } catch (error) {
        console.log(error.message);
    }
}

const verifyLogin = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        const userData = await User.findOne({ email: email });
        if (userData) {
            const passwordMatch = await bcrypt.compare(password, userData.password);
            if (passwordMatch) {
                if (userData.is_admin === 0) {
                    res.render('login', { message: "Email and Password is Incorrect" });
                }
                else {
                    req.session.user_id = userData._id;
                    res.redirect('/admin/home');
                }
            }
            else {
                res.render('login', { message: "Email and Password is Incorrect" });
            }
        }
        else {
            res.render('login', { message: "Email and Password is Incorrect" });
        }
    } catch (error) {
        console.log(error.message);
    }
}

const loadDashbord = async (req, res) => {
    try {
        const userData = await User.findById({ _id: req.session.user_id });

        res.render('home', { admin: userData });
    } catch (error) {
        console.log(error.message);
    }
}

const logout = async (req, res) => {
    try {
        req.session.destroy();
        res.redirect('/admin');
    } catch (error) {
        console.log(error.message);
    }
}
const forgetLoad = async (req, res) => {
    try {
        res.render('forget');
    } catch (error) {
        console.log(error.message);
    }
}

const forgetVerify = async (req, res) => {
    try {
        const email = req.body.email;
        const userData = await User.findOne({ email: email });
        if (userData) {
            if (userData.is_admin === 0) {
                res.render('forget', { message: "Email is incorrect" });
            }
            else {
                const random = randomString.generate();
                const updatedData = await User.updateOne({ email: email }, { $set: { token: random } });
                sendvReaetPasswordMail(userData.name, userData.email, random);
                res.render('forget', { message: 'Plase check your mail to reset your password' })
            }
        }
        else {
            res.render('forget', { message: "Email is incorrect" });
        }
    } catch (error) {
        console.log(error.message);
    }
}

const forgetPasswordLoad = async (req, res) => {
    try {
        const token = req.query.token;
        const tokenData = await User.findOne({ token: token });
        if (tokenData) {
            res.render('forget-password', { user_id: tokenData._id });
        }
        else {
            res.render('404', { message: "invalid Link" });
        }

    } catch (error) {
        console.log(error.message);
    }
}

const resetPassword = async (req, res) => {
    try {
        const password = req.body.password;
        const user_id = req.body.user_id;
        const securePass = await securePassword(password);
        const updatedData = await User.findByIdAndUpdate({ _id: user_id }, { $set: { password: securePass, token: "" } });
        res.redirect('/admin');
    } catch (error) {
        console.log(error.message);
    }
}

const adminDashboard = async (req, res) => {
    try {
        const usersData = await User.find({ is_admin: 0 });
        res.render('dashboard', { users: usersData });
    } catch (error) {
        console.log(error.message);
    }
}

// Work new User work start

const newUserLoad = async (req, res) => {
    try {
        res.render('new-user');
    } catch (error) {
        console.log(error.message);
    }
}

const addUser = async (req, res) => {
    try {
        const userEmail = await User.exists({ email: req.body.email });
        if (userEmail) {
            res.render('new-user', { message: "Email already exist, Pleae enter a new email" });
        }
        else {
            const name = req.body.name;
            const email = req.body.email;
            const mobile = req.body.mno;
            const image = req.file.filename;
            const password = randomString.generate(8);

            const spassword = await securePassword(password);
            const user = new User({
                name: name,
                email: email,
                mobile: mobile,
                image: image,
                password: spassword,
                is_admin: 0
            });

            const userData = await user.save();

            if (userData) {
                addUserMail(name, email, password, userData._id);
                res.redirect('/admin/dashboard');
            }
            else {
                res.render('new-user', { message: "Something Went Wrong" });
            }
        }
    } catch (error) {
        console.log(error.message);
    }
}

// Edit user funcationality
const editUserLoad = async (req, res) => {
    try {
        const id = req.query.id;
        const userData = await User.findById({ _id: id });
        if (userData) {
            res.render('edit-user', { user: userData });
        }
        else {
            res.redirect("/admin/dashboard");
        }
        res.render('edit-user');
    } catch (error) {
        console.log(error.message);
    }
}

const updateUsers = async (req, res) => {
    try {
        const userData = await User.findByIdAndUpdate({ _id: req.body.id }, { $set: { name: req.body.name, mobile: req.body.mno, is_verified: req.body.verify, } })
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.log(error.message);
    }
}

const deleteUser = async (req, res) => {
    try {
        const userData = await User.findByIdAndDelete({ _id: req.query.id })
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    loadLogin,
    verifyLogin,
    loadDashbord,
    logout,
    forgetLoad,
    forgetVerify,
    forgetPasswordLoad,
    resetPassword,
    adminDashboard,
    newUserLoad,
    addUser,
    editUserLoad,
    updateUsers,
    deleteUser
};