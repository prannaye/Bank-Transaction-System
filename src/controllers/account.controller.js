const accountModel = require("../models/account.model")

//creates and account with the user id and send the account in response
async function createAccountController(req,res){

    const user = req.user;

    const account = await accountModel.create({
        user: user._id
    })

    res.status(201).json({
        account
    })
}


module.exports={
    createAccountController
}
    