const mongoose = require("mongoose")

function connectToDB(){ //connection of the databse with the server
    mongoose.connect(process.env.MONGO_URI)
    .then(()=>{
        console.log("Server is connected to DB")
    })
    .catch(err => {
        console.log("Error connecting to DB")
        process.exit(1)
    })
}



module.exports = connectToDB