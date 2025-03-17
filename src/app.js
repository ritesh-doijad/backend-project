import express from 'express'
import cors from "cors"
import cookieParser from "cookie-parser"


const app=express()

app.use(cors())
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())


//routes imports

import userRouter from "./routes/user.routes.js"


// routes declartion
app.use("/api/v1/users",userRouter)


//http://localhost:3000/api/v1/users/register
export {app}