//WHAT DOES app.js DO?
//1.Creates an instance of the server
//2.Config the server means which middleware we are using and
//what types of API's we will use 


const express = require("express") //we are requiring a package express 

const cookieParser = require("cookie-parser")




const app = express() //saved instance of server into app


app.use(express.json())//middleware: server cannot read by default the content of req.body so this helps to read the data 
app.use(cookieParser())

/**
 * - Routes required
 */
const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")
const transactionRoutes = require("./routes/transaction.routes")
/**
 * - Use Routes
 */
app.use("/api/auth",authRouter)//all requests starting from /api/auth will be redirected to auth Router
app.use("/api/accounts",accountRouter)
app.use("/api/transactions",transactionRoutes)


module.exports = app //we are exporting the app instance to the server.js