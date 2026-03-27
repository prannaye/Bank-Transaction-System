//The Server is started here
require("dotenv").config()//to use sensitive strings in the code to short form 

const app = require("./src/app") //import and require both can be used
const connectToDB = require("./src/config/db")

connectToDB()

app.listen(3000, ()=>{
    console.log("Server is running on port 3000")
})