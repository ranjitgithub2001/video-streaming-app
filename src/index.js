//require ('dotenv').config({path:'./env'})
//above is also the way of configuring .env file
// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";
import  dotenv from "dotenv";
import connectDB from "./dbConnection/index.js";
import app from "./app.js";

dotenv.config({
    path: './env'
})
const port=process.env.PORT || 8000
connectDB()
.then(()=>{
    app.listen(port, ()=>{
        console.log(`Server is running at port: ${port}`);
    })
    app.on('error', ()=>{
        console.log('Error: ',error);
        throw error;
    })
})
.catch((error)=>{
    console.log('MongoDB Connection failed !!! ', error);
})






/*
import express from "express";
const app=express()

; ( async ( )=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on('Error', (error)=>{
            console.log("Error: ",error);
            throw error
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`App is listening on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.log("Error  ", error)
    }
})()
*/