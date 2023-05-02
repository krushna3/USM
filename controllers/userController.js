const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const randomstring = require("randomstring");
const nodemailer = require('nodemailer');
const config = require("../config/config")


const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.log(error.message);
    }
}

// for send mail
const sendverifyMail = async (name, email, user_id) => {
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
            subject: 'For verifycation mail',
            html: '<p>hii ' + name + ', please click here to <a href = "http://localhost:3000/verify?id=' + user_id + '"> Verify</a> Your mail.</p>'
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
// reset password sendmail
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
            html: '<p>hii ' + name + ', please click here to <a href = "http://localhost:3000/forget-password?token=' + token + '"> Reset </a> Your Password.</p>'
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


const loadRegister = async (req, res) => {
    try {
        res.render('registration');
    }
    catch (error) {
        console.log(error.message);
    }
}

const insertUser = async (req, res) => {
    try {
        const userEmail = await User.exists({ email: req.body.email });
        if (userEmail) {
            res.render('registration', { message: "Email already exist, Pleae enter a new email" });
        }
        else {
            const spassword = await securePassword(req.body.password);
            const user = new User({
                name: req.body.name,
                email: req.body.email,
                mobile: req.body.mno,
                image: req.file.filename,
                password: spassword,
                is_admin: 0
            });

            const userData = await user.save();

            if (userData) {
                sendverifyMail(req.body.name, req.body.email, userData._id);
                res.render('registration', { message: "Your registration has been successfully,please verify your mail" })
            }
            else {
                res.render('registration', { message: "Your registration has been failed" })
            }
        }
    } catch (error) {
        console.log(error.message);
    }
};
const verifyMail = async (req, res) => {
    try {
        const userData = await User.findById({ _id: req.query.id });
        if (!userData.temp_email) {
            await User.updateOne({ _id: req.query.id }, { $set: { is_verified: 1, email: userData.email, temp_verified: 1, temp_email: "" } });
            res.render("login", { message: "Your email has been verified please login with your new email" });
        }
        else {
            await User.updateOne({ _id: req.query.id }, { $set: { is_verified: 1, email: userData.temp_email, temp_verified: 1, temp_email: "" } });
            res.render("login", { message: "Your email has been verified please login with your new email" });
        }
    } catch (error) {
        console.log(error.message)
    }
}

// login user method start

const loginLoad = async (req, res) => {
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
            const passwordMatch = await bcrypt.compare(password, userData.password)
            if (passwordMatch) {
                if (userData.is_verified === 0) {
                    res.render('login', { message: "Please verify your mail." });
                }
                else {
                    req.session.user_id = userData._id;
                    res.redirect('/home');
                }
            }
            else {
                res.render('login', { message: "Email and Password is incorrect" })
            }
        }
        else {
            res.render('login', { message: "Email and Password is incorrect" })
        }

    } catch (error) {
        console.log(error.message);
    }

}

const loadHome = async (req, res) => {
    try {
        const userData = await User.findById({ _id: req.session.user_id });
        res.render('home', { user: userData });
    }
    catch (error) {
        console.log(error.message);
    }
}

const userLogout = async (req, res) => {
    try {
        req.session.destroy();
        res.redirect('/');
    } catch (error) {
        console.log(error.message);
    }
}

// forget password code start
const forgetLoad = async (req, res, next) => {
    try {
        res.render('forget');
    } catch (error) {
        console.log(error.message);
    }
}

const forgetverify = async (req, res) => {
    try {
        const email = req.body.email;
        const userData = await User.findOne({ email: email });
        if (userData) {
            if (userData.is_verified === 0) {
                res.render('forget', { message: "please verify your mail" });
            }
            else {
                const randomString = randomstring.generate();
                const updateData = await User.updateOne({ email: email }, { $set: { token: randomString } });
                sendvReaetPasswordMail(userData.name, userData.email, randomString);
                res.render('forget', { message: "Please check your mail to reset your password" });
            }
        } else {
            res.render('forget', { message: "Mail is incorrect" });
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
            res.render('404', { message: "Token is invalid" });
        }
    } catch (error) {
        console.log(error.message);
    }
}

const resetPassword = async (req, res) => {
    try {
        const password = req.body.password;
        const user_id = req.body.user_id;
        const secure_password = await securePassword(password);
        const updatedData = await User.findByIdAndUpdate({ _id: user_id }, { $set: { password: secure_password, token: '' } })
        res.redirect("/");
    } catch (error) {
        console.log(error.message);
    }
}
// for verification send link
const verificationLoad = async (req, res) => {
    try {
        res.render('verification');
    } catch (error) {
        console.log(error.message);
    }
}
const sendVerificationLink = async (req, res) => {
    try {
        const email = req.body.email;
        const userData = await User.findOne({ email: email })
        if (userData) {
            await sendverifyMail(userData.name, userData.email, userData._id);
            res.render('verification', { message: "Please chake your mail for verification." })
        }
        else {
            res.render('verification', { message: "Incorrect Email, Please Enter a Correct Email." })
        }
    } catch (error) {
        console.log(error.message);
    }
}
// Edit and update user
const editLoad = async (req, res) => {
    try {
        const id = req.query.id;
        const userData = await User.findById({ _id: id });
        if (userData) {
            res.render('edit', { user: userData });
        }
        else {
            res.redirect('/home');
        }
    } catch (error) {
        console.log(error.message);
    }
}

const updateProfile = async (req, res) => {
    try {
        const user = await User.findById({ _id: req.body.user_id })
        const preEmail = user.email;
        const currentEmail = req.body.email;
        if (preEmail === currentEmail) {
            if (req.file) {
                const userData = await User.findByIdAndUpdate({ _id: req.body.user_id }, { $set: { name: req.body.name, mobile: req.body.mno, image: req.file.filename, email: req.body.email } })

            }
            else {
                const userData = await User.findByIdAndUpdate({ _id: req.body.user_id }, { $set: { name: req.body.name, mobile: req.body.mno, email: req.body.email } })
            }
            res.redirect('/home');
        }
        else {
            const checkEmail = await User.exists({ email: req.body.email });
            if (checkEmail) {
                res.render('edit', { user: user, message: "email is already exist" });
            }
            else {
                if (req.file) {
                    const userData = await User.findByIdAndUpdate({ _id: req.body.user_id }, { $set: { name: req.body.name, mobile: req.body.mno, image: req.file.filename, temp_email: req.body.email, temp_verified: 0 } })
                    res.redirect('/home');
                }
                else {
                    const userData = await User.findByIdAndUpdate({ _id: req.body.user_id }, { $set: { name: req.body.name, mobile: req.body.mno, temp_email: req.body.email, temp_verified: 0 } })
                    res.redirect('/home');
                }
            }
        }

    } catch (error) {
        console.log(error.message);
    }
}

const updateEmailVerify = async (req, res) => {
    try {
        const user = await User.findById({ _id: req.session.user_id })
        console.log(req.session.user_id);
        await sendverifyMail(user.name, user.temp_email, user._id);
        res.render('home', { user: user, message: "Email Send Successfully, Please Check Your Email" });

    } catch (error) {
        console.log(error.message);
    }
}


module.exports = {
    loadRegister,
    insertUser,
    verifyMail,
    loginLoad,
    verifyLogin,
    loadHome,
    userLogout,
    forgetLoad,
    forgetverify,
    forgetPasswordLoad,
    resetPassword,
    verificationLoad,
    sendVerificationLink,
    editLoad,
    updateProfile,
    updateEmailVerify
};