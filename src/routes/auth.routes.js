const express = require("express")
const authController = require("../controllers/auth.controller")
const router = express.Router()



//this is an api from the method post => /api/auth/register
//API 1 register
router.post("/register",authController.userRegisterController)

/**Post /api/auth/login */
//API 2 login
router.post("/login",authController.userLoginController)


module.exports = router